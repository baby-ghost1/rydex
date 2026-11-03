import { NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError, jsonError } from "@rydex/backend/lib/auth-helpers";
import { findEligibleVehicles } from "@rydex/backend/lib/eligible-vehicles";
import { getRoadRoute } from "@rydex/backend/lib/route";
import { calculateFare, type FareBreakdown } from "@rydex/shared/fare";
import { VEHICLE_CATEGORIES } from "@rydex/shared/constants";
import type { VehicleCategory } from "@rydex/shared/types";

const schema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  dropLat: z.coerce.number().min(-90).max(90),
  dropLng: z.coerce.number().min(-180).max(180),
  category: z.enum(["bike", "car", "auto", "loading", "truck"]).optional(),
  maxDistanceKm: z.coerce.number().min(1).max(100).optional().default(15),
});

interface CategoryGroup {
  count: number;
  partnerIds: Set<string>;
  nearestKm: number;
  fare: FareBreakdown;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = schema.safeParse({
      lat: searchParams.get("lat"),
      lng: searchParams.get("lng"),
      dropLat: searchParams.get("dropLat"),
      dropLng: searchParams.get("dropLng"),
      category: searchParams.get("category") || undefined,
      maxDistanceKm: searchParams.get("maxDistanceKm") || undefined,
    });
    if (!parsed.success) {
      return jsonError("Pickup and drop coordinates are required.", 422);
    }

    const { lat, lng, dropLat, dropLng, category, maxDistanceKm } = parsed.data;
    const pickup = { lat, lng };
    const drop = { lat: dropLat, lng: dropLng };

    const [route, eligible] = await Promise.all([
      getRoadRoute(pickup, drop),
      findEligibleVehicles({ lat, lng, category, dropLat, dropLng, maxDistanceKm }),
    ]);

    const groups = new Map<VehicleCategory, CategoryGroup>();

    for (const item of eligible) {
      const fare = calculateFare({
        distanceKm: route.distanceKm,
        durationMin: route.durationMin,
        baseFare: item.vehicle.baseFare,
        pricePerKm: item.vehicle.pricePerKm,
        pricePerHour: item.vehicle.pricePerHour,
        minimumFare: item.vehicle.minimumFare,
      });

      const current = groups.get(item.vehicle.category);
      if (!current) {
        groups.set(item.vehicle.category, {
          count: 1,
          partnerIds: new Set([String(item.owner._id)]),
          nearestKm: item.distanceToPickupKm,
          fare,
        });
        continue;
      }

      current.partnerIds.add(String(item.owner._id));
      current.count += 1;
      current.nearestKm = Math.min(current.nearestKm, item.distanceToPickupKm);
      if (fare.total < current.fare.total) current.fare = fare;
    }

    const options = VEHICLE_CATEGORIES.filter((item) => groups.has(item.value)).map(
      (item) => {
        const group = groups.get(item.value)!;
        return {
          category: item.value,
          count: group.partnerIds.size,
          etaMin: Math.max(2, Math.round((group.nearestKm / 22) * 60)),
          nearestKm: group.nearestKm,
          fare: group.fare,
        };
      },
    );

    return NextResponse.json({
      ok: true,
      options,
      distanceKm: route.distanceKm,
      durationMin: route.durationMin,
      routeProvider: route.provider,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
