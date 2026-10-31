import { NextResponse } from "next/server";
import { clientIp, rateLimit } from "@rydex/backend/lib/rate-limit";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fromLat = Number(searchParams.get("fromLat"));
  const fromLng = Number(searchParams.get("fromLng"));
  const toLat = Number(searchParams.get("toLat"));
  const toLng = Number(searchParams.get("toLng"));
  if (![fromLat, fromLng, toLat, toLng].every(Number.isFinite)) {
    return NextResponse.json({ error: "Valid from/to coordinates are required." }, { status: 422 });
  }

  const limit = rateLimit(`geo-route:${clientIp(request)}`, 40, 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many route requests." }, { status: 429 });
  }

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson&steps=false`;
    const res = await fetch(url, {
      headers: { "User-Agent": "RYDEX/1.0" },
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 300 },
    });
    if (!res.ok) throw new Error(`OSRM returned ${res.status}`);
    const data = await res.json();
    const route = data.routes?.[0];
    if (!route) throw new Error("No route found");
    const geometry = (route.geometry?.coordinates || []).map(([lng, lat]: [number, number]) => [lat, lng]);
    return NextResponse.json({
      ok: true,
      distanceKm: Math.round((route.distance / 1000) * 10) / 10,
      durationMin: Math.round(route.duration / 60),
      geometry,
      provider: "osrm",
    });
  } catch (error) {
    console.error("[geo] route failed", error);
    return NextResponse.json({ error: "Routing is unavailable right now." }, { status: 502 });
  }
}
