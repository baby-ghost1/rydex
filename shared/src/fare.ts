import { FARE_CONFIG } from "@rydex/shared/constants";

export interface FareInput {
  distanceKm: number;
  durationMin: number;
  baseFare: number;
  pricePerKm: number;
  pricePerHour?: number;
  minimumFare?: number;
}

export interface FareBreakdown {
  base: number;
  distance: number;
  time: number;
  total: number;
  partnerEarning: number;
  platformFee: number;
}

export function calculateFare(input: FareInput): FareBreakdown {
  const distanceKm = Math.max(0, Number(input.distanceKm) || 0);
  const durationMin = Math.max(0, Number(input.durationMin) || 0);
  const base = Math.max(0, Number(input.baseFare) || 0);
  const distance = Math.round(distanceKm * Math.max(0, Number(input.pricePerKm) || 0));
  const time = Math.round((Math.max(0, Number(input.pricePerHour) || 0) * durationMin) / 60);
  const rawTotal = base + distance + time;
  const total = Math.max(Math.round(Number(input.minimumFare) || 0), rawTotal);
  const platformFee = Math.round(total * FARE_CONFIG.platformRate);
  const partnerEarning = total - platformFee;
  return { base, distance, time, total, partnerEarning, platformFee };
}

export function estimateDuration(distanceKm: number) {
  // City traffic average ≈ 22 km/h + 4 min pickup padding.
  return Math.max(6, Math.round((distanceKm / 22) * 60 + 4));
}

export function estimateDistanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 1.28 * 10) / 10;
}
