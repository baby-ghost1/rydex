import { connectDB } from "@rydex/backend/lib/db";
import { Vehicle } from "@rydex/backend/models/vehicle.model";
import { estimateDistanceKm } from "@rydex/shared/fare";
import type { VehicleCategory } from "@rydex/shared/types";

export const STALE_PARTNER_LOCATION_MS = 5 * 60 * 1000;

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface PartnerProfileLike {
  businessName?: string;
  preferences?: {
    acceptRadiusKm?: number;
    maxDestinationKm?: number;
  };
  currentLocation?: {
    lat?: number;
    lng?: number;
    updatedAt?: string | Date;
    isOnline?: boolean;
  };
}

export interface PartnerOwnerLike {
  _id: unknown;
  name?: string;
  image?: string;
  partnerProfile?: PartnerProfileLike;
}

export interface EligibleVehicleDoc {
  _id: unknown;
  owner: PartnerOwnerLike;
  category: VehicleCategory;
  name: string;
  image: string;
  registrationNumber: string;
  baseFare: number;
  pricePerKm: number;
  pricePerHour?: number;
  minimumFare?: number;
  [key: string]: unknown;
}

export interface EligibleVehicle {
  vehicle: EligibleVehicleDoc;
  owner: PartnerOwnerLike;
  distanceToPickupKm: number;
}

/**
 * Checks the partner's online presence, location freshness, pickup radius and
 * destination limit. Shared by nearby search, ride options and broadcast queues
 * so every surface uses exactly the same eligibility rules.
 */
export function partnerAvailableFor(
  profile: PartnerProfileLike | undefined,
  pickup?: Coordinates,
  drop?: Coordinates,
) {
  const location = profile?.currentLocation;
  if (!location?.isOnline) return false;
  if (typeof location.lat !== "number" || typeof location.lng !== "number") return false;

  const updatedAt = location.updatedAt ? new Date(location.updatedAt).getTime() : NaN;
  if (!Number.isFinite(updatedAt) || Date.now() - updatedAt > STALE_PARTNER_LOCATION_MS) {
    return false;
  }

  if (pickup) {
    const acceptRadiusKm = profile?.preferences?.acceptRadiusKm || 10;
    const distanceToPickup = estimateDistanceKm(
      { lat: location.lat, lng: location.lng },
      pickup,
    );
    if (distanceToPickup > acceptRadiusKm) return false;
  }

  if (pickup && drop) {
    const maxDestinationKm = profile?.preferences?.maxDestinationKm || 50;
    if (estimateDistanceKm(pickup, drop) > maxDestinationKm) return false;
  }

  return true;
}

export async function findEligibleVehicles({
  lat,
  lng,
  category,
  dropLat,
  dropLng,
  maxDistanceKm = 15,
}: {
  lat: number;
  lng: number;
  category?: VehicleCategory;
  dropLat?: number;
  dropLng?: number;
  maxDistanceKm?: number;
}): Promise<EligibleVehicle[]> {
  await connectDB();

  const filter: Record<string, unknown> = { approved: true, available: true };
  if (category) filter.category = category;

  const vehicles = (await Vehicle.find(filter)
    .populate(
      "owner",
      "name image partnerProfile.businessName partnerProfile.preferences partnerProfile.currentLocation",
    )
    .lean()) as unknown as EligibleVehicleDoc[];

  const pickup = { lat, lng };
  const drop = dropLat !== undefined && dropLng !== undefined ? { lat: dropLat, lng: dropLng } : undefined;

  const eligible: EligibleVehicle[] = [];
  for (const vehicle of vehicles) {
    const owner = vehicle.owner;
    if (!owner) continue;
    if (!partnerAvailableFor(owner.partnerProfile, pickup, drop)) continue;

    const location = owner.partnerProfile?.currentLocation;
    if (!location || typeof location.lat !== "number" || typeof location.lng !== "number") continue;

    const distanceToPickupKm =
      Math.round(
        estimateDistanceKm({ lat: location.lat, lng: location.lng }, pickup) * 10,
      ) / 10;
    if (distanceToPickupKm > maxDistanceKm) continue;

    eligible.push({ vehicle, owner, distanceToPickupKm });
  }

  eligible.sort((a, b) => a.distanceToPickupKm - b.distanceToPickupKm);
  return eligible;
}
