import { connectDB } from "@rydex/backend/lib/db";
import { estimateDuration, estimateDistanceKm } from "@rydex/shared/fare";

export interface RoadRoute {
  distanceKm: number;
  durationMin: number;
  geometry: Array<[number, number]>;
  provider: "osrm" | "estimate";
}

export async function getRoadRoute(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): Promise<RoadRoute> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson&steps=false`;
    const response = await fetch(url, {
      headers: { "User-Agent": "RYDEX/1.0" },
      signal: AbortSignal.timeout(6000),
      next: { revalidate: 300 },
    });
    if (response.ok) {
      const data = await response.json();
      const route = data.routes?.[0];
      if (route) {
        return {
          distanceKm: Math.round((route.distance / 1000) * 10) / 10,
          durationMin: Math.max(1, Math.round(route.duration / 60)),
          geometry: (route.geometry?.coordinates || []).map(([lng, lat]: [number, number]) => [
            lat,
            lng,
          ]),
          provider: "osrm",
        };
      }
    }
  } catch (error) {
    console.warn("[route] OSRM unavailable, using estimate:", error);
  }
  const distanceKm = estimateDistanceKm(from, to);
  return {
    distanceKm,
    durationMin: estimateDuration(distanceKm),
    geometry: [
      [from.lat, from.lng],
      [to.lat, to.lng],
    ],
    provider: "estimate",
  };
}

export function isFutureRide(date: string, time: string) {
  const iso = `${date}T${time}:00+05:30`;
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return false;
  return ts > Date.now() + 5 * 60 * 1000;
}

export function activeBooking(status: string) {
  return ["pending", "accepted", "arrived", "started"].includes(status);
}

// Re-exported for convenience in booking routes.
export { connectDB };
