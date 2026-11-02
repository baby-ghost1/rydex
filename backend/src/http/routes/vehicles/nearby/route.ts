import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@rydex/backend/lib/db";
import { Vehicle } from "@rydex/backend/models/vehicle.model";
import { parsePagination, handleApiError, jsonError } from "@rydex/backend/lib/auth-helpers";
import { estimateDistanceKm } from "@rydex/shared/fare";

interface NearbyOwner {
  _id: unknown;
  name?: string;
  image?: string;
  partnerProfile?: {
    businessName?: string;
    preferences?: {
      acceptRadiusKm?: number;
      maxDestinationKm?: number;
    };
    currentLocation?: {
      lat: number;
      lng: number;
      updatedAt?: string | Date;
      isOnline?: boolean;
    };
  };
}

function ownerOf(vehicle: { owner: unknown }): NearbyOwner | null {
  return (vehicle.owner as NearbyOwner | null) || null;
}

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
    await connectDB();
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

    // Build the base vehicle filter
    const vehicleFilter: Record<string, unknown> = {
      approved: true,
      available: true,
    };
    if (category) vehicleFilter.category = category;

    // Find all matching vehicles first (we need to populate owner for partner info)
    const vehicles = await Vehicle.find(vehicleFilter)
      .populate("owner", "name image partnerProfile.businessName partnerProfile.preferences partnerProfile.currentLocation")
      .lean();

    // Filter vehicles based on partner criteria
    const now = Date.now();
    const STALE_LOCATION_MS = 5 * 60 * 1000; // 5 minutes

    const eligibleVehicles = vehicles.filter((vehicle) => {
      const owner = ownerOf(vehicle);
      if (!owner) return false;

      const partnerProfile = owner.partnerProfile;
      if (!partnerProfile) return false;

      // Partner must be online
      const location = partnerProfile.currentLocation;
      if (!location?.isOnline) return false;

      // Location must be recent (within 5 minutes)
      const updatedAt = location.updatedAt ? new Date(location.updatedAt).getTime() : NaN;
      if (!Number.isFinite(updatedAt) || now - updatedAt > STALE_LOCATION_MS) return false;

      // Check accept radius
      const acceptRadiusKm = partnerProfile.preferences?.acceptRadiusKm || 10;
      const partnerLat = location.lat;
      const partnerLng = location.lng;
      const distanceToPickup = estimateDistanceKm({ lat: partnerLat, lng: partnerLng }, { lat, lng });

      if (distanceToPickup > acceptRadiusKm) return false;

      // Check max destination distance if drop location provided
      if (dropLat !== undefined && dropLng !== undefined) {
        const maxDestKm = partnerProfile.preferences?.maxDestinationKm || 50;
        const rideDistance = estimateDistanceKm({ lat, lng }, { lat: dropLat, lng: dropLng });
        if (rideDistance > maxDestKm) return false;
      }

      // Check max distance from user's search
      if (distanceToPickup > maxDistanceKm) return false;

      return true;
    });

    // Sort by distance to pickup
    eligibleVehicles.sort((a, b) => {
      const aLoc = ownerOf(a)?.partnerProfile?.currentLocation;
      const bLoc = ownerOf(b)?.partnerProfile?.currentLocation;
      if (!aLoc || !bLoc) return 0;
      const aDist = estimateDistanceKm({ lat: aLoc.lat, lng: aLoc.lng }, { lat, lng });
      const bDist = estimateDistanceKm({ lat: bLoc.lat, lng: bLoc.lng }, { lat, lng });
      return aDist - bDist;
    });

    // Apply pagination
    const { page, limit, skip } = parsePagination(request.url, 20);
    const paginated = eligibleVehicles.slice(skip, skip + limit);

    // Format response
    const formatted = paginated.map((vehicle) => {
      const owner = ownerOf(vehicle);
      const partnerProfile = owner?.partnerProfile;
      const location = partnerProfile?.currentLocation;
      let distanceToPickup = null;
      if (location) {
        distanceToPickup = Math.round(estimateDistanceKm({ lat: location.lat, lng: location.lng }, { lat, lng }) * 10) / 10;
      }

      return {
        ...vehicle,
        owner: {
          _id: owner?._id,
          name: owner?.name,
          image: owner?.image,
          partnerProfile: {
            businessName: partnerProfile?.businessName,
            acceptRadiusKm: partnerProfile?.preferences?.acceptRadiusKm,
            maxDestinationKm: partnerProfile?.preferences?.maxDestinationKm,
          },
        },
        distanceToPickupKm: distanceToPickup,
        partnerOnline: true,
      };
    });

    return NextResponse.json({
      ok: true,
      vehicles: formatted,
      pagination: { page, limit, total: eligibleVehicles.length, pages: Math.max(1, Math.ceil(eligibleVehicles.length / limit)) },
    });
  } catch (error) {
    return handleApiError(error);
  }
}