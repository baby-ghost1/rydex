import { NextResponse } from "next/server";
import { clientIp, rateLimit } from "@rydex/backend/lib/rate-limit";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ results: [] });

  const limit = rateLimit(`geo-search:${clientIp(request)}`, 45, 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many searches. Wait a moment." }, { status: 429 });
  }

  const key = process.env.GEOAPIFY_KEY;
  if (key) {
    try {
      const url = new URL("https://api.geoapify.com/v1/geocode/search");
      url.searchParams.set("text", q);
      url.searchParams.set("limit", "6");
      url.searchParams.set("filter", "countrycode:in");
      url.searchParams.set("lang", "en");
      url.searchParams.set("apiKey", key);
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (res.ok) {
        const data = (await res.json()) as {
          features?: Array<{
            properties?: { formatted?: string; lat?: number; lon?: number };
          }>;
        };
        const results = (data.features || [])
          .filter((feature) => feature.properties?.formatted)
          .map((feature) => ({
            address: feature.properties?.formatted as string,
            lat: feature.properties?.lat as number,
            lng: feature.properties?.lon as number,
          }));
        if (results.length) return NextResponse.json({ results, provider: "geoapify" });
      }
    } catch (error) {
      console.warn("[geo] Geoapify search failed, falling back:", error);
    }
  }

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", q);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "6");
    url.searchParams.set("countrycodes", "in");
    url.searchParams.set("addressdetails", "0");
    const res = await fetch(url, {
      headers: { "User-Agent": "RYDEX/1.0 (support@rydex.app)" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) throw new Error(`Nominatim returned ${res.status}`);
    const data = (await res.json()) as Array<{ display_name: string; lat: string; lon: string }>;
    const results = data.map((item) => ({
      address: item.display_name,
      lat: Number(item.lat),
      lng: Number(item.lon),
    }));
    return NextResponse.json({ results, provider: "nominatim" });
  } catch (error) {
    console.error("[geo] search failed", error);
    return NextResponse.json({ error: "Location search is unavailable right now." }, { status: 502 });
  }
}
