import { NextResponse } from "next/server";
import { z } from "zod";
import { parsePagination, handleApiError, jsonError } from "@rydex/backend/lib/auth-helpers";
import { findEligibleVehicles } from "@rydex/backend/lib/eligible-vehicles";

const schema = z
  .object({
    lat: z.coerce.number().min(-90).max(90),
    lng: z.coerce.number().min(-180).max(180),
    category: z.enum(["bike", "car", "auto", "loading", "truck"]).optional(),
    dropLat: z.coerce.number().min(-90).max(90).optional(),
    dropLng: z.coerce.number().min(-180).max(180).optional(),
    maxDistanceKm: z.coerce.number().min(1).max(100).optional().default(15),
  })
  .refine((value) => (value.dropLat === undefined) === (value.dropLng === undefined), {
    message: "Both drop coordinates are required.",
    path: ["dropLng"],
  });

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const latParam = searchParams.get("lat");
    const lngParam = searchParams.get("lng");
    if (latParam === null || lngParam === null) {
      return jsonError("Pickup coordinates are required.", 422);
    }

    const parsed = schema.safeParse({
      lat: latParam,
      lng: lngParam,
      category: searchParams.get("category") || undefined,
      dropLat: searchParams.get("dropLat") || undefined,
      dropLng: searchParams.get("dropLng") || undefined,
      maxDistanceKm: searchParams.get("maxDistanceKm") || undefined,
    });

    if (!parsed.success) return jsonError("Invalid location parameters.", 422);

    const { lat, lng, category, dropLat, dropLng, maxDistanceKm } = parsed.data;
    const eligible = await findEligibleVehicles({
      lat,
      lng,
      category,
      dropLat,
      dropLng,
      maxDistanceKm,
    });

    const { page, limit, skip } = parsePagination(request.url, 20);
    const paginated = eligible.slice(skip, skip + limit);

    const formatted = paginated.map(({ vehicle, owner, distanceToPickupKm }) => ({
      ...vehicle,
      owner: {
        _id: owner._id,
        name: owner.name,
        image: owner.image,
        partnerProfile: {
          businessName: owner.partnerProfile?.businessName,
          acceptRadiusKm: owner.partnerProfile?.preferences?.acceptRadiusKm,
          maxDestinationKm: owner.partnerProfile?.preferences?.maxDestinationKm,
        },
      },
      distanceToPickupKm,
      partnerOnline: true,
    }));

    return NextResponse.json({
      ok: true,
      vehicles: formatted,
      pagination: {
        page,
        limit,
        total: eligible.length,
        pages: Math.max(1, Math.ceil(eligible.length / limit)),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
