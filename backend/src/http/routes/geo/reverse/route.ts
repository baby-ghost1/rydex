import { NextResponse } from "next/server";
import { clientIp, rateLimit } from "@rydex/backend/lib/rate-limit";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "Valid coordinates are required." }, { status: 422 });
  }

  const limit = rateLimit(`geo-reverse:${clientIp(request)}`, 45, 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many requests. Wait a moment." }, { status: 429 });
  }

  const key = process.env.GEOAPIFY_KEY;
  if (key) {
    try {
      const url = new URL("https://api.geoapify.com/v1/geocode/reverse");
      url.searchParams.set("lat", String(lat));
      url.searchParams.set("lon", String(lng));
      url.searchParams.set("lang", "en");
      url.searchParams.set("apiKey", key);
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (res.ok) {
        const data = await res.json();
        const address = data.features?.[0]?.properties?.formatted;
        if (address) return NextResponse.json({ address, lat, lng, provider: "geoapify" });
      }
    } catch (error) {
      console.warn("[geo] Geoapify reverse failed, falling back:", error);
    }
  }

  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lng));
    url.searchParams.set("format", "jsonv2");
    const res = await fetch(url, {
      headers: { "User-Agent": "RYDEX/1.0 (support@rydex.app)" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) throw new Error(`Nominatim returned ${res.status}`);
    const data = (await res.json()) as { display_name?: string };
    if (!data.display_name) throw new Error("No address found");
    return NextResponse.json({ address: data.display_name, lat, lng, provider: "nominatim" });
  } catch (error) {
    console.error("[geo] reverse failed", error);
    return NextResponse.json({ error: "Reverse geocoding is unavailable." }, { status: 502 });
  }
}
