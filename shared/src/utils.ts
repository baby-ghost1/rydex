export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function inr(amount: number, compact = false) {
  if (!Number.isFinite(amount)) return "₹0";
  if (compact && amount >= 100000) {
    return `₹${(amount / 100000).toFixed(amount >= 1000000 ? 0 : 1)}L`;
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

export function formatDate(value: string | Date | undefined, withTime = false) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(date);
}

export function timeAgo(value: string | Date | undefined) {
  if (!value) return "-";
  const seconds = Math.floor((Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "yesterday" : `${days}d ago`;
}

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** India Standard Time (UTC+5:30) offset used across the app. */
export const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/**
 * Legacy booking reference (pre-serial era): #RY + ddmmyyyy + hhmmss + unique.
 * Only used as a fallback for records that never stored a code. New bookings
 * use @rydex/backend/lib/booking-code (db serial + sequence + 4-char suffix).
 */
export function formatBookingCode(date: Date | string, unique: string | number) {
  const parsed = date instanceof Date ? date : new Date(date);
  const stamp = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const ist = new Date(stamp.getTime() + IST_OFFSET_MS);
  const pad = (value: number) => String(value).padStart(2, "0");
  const day = pad(ist.getUTCDate());
  const month = pad(ist.getUTCMonth() + 1);
  const year = ist.getUTCFullYear();
  const hours = pad(ist.getUTCHours());
  const minutes = pad(ist.getUTCMinutes());
  const seconds = pad(ist.getUTCSeconds());
  const suffix = String(unique)
    .replace(/[^a-z0-9]/gi, "")
    .toUpperCase()
    .padStart(4, "0")
    .slice(-4);
  return `#RY${day}${month}${year}${hours}${minutes}${seconds}${suffix}`;
}

/**
 * Deterministic booking reference for records created before codes were stored.
 * Uses the tail of the mongo id so every booking still has a unique reference.
 */
export function bookingCodeFor(createdAt?: string | Date, id?: string) {
  const unique = (id || "").slice(-4).toUpperCase() || "0000";
  return formatBookingCode(createdAt || new Date(), unique);
}

/** Picks the stored booking code, falling back to a derived one for older rides. */
export function resolveBookingCode(booking: {
  bookingCode?: string | null;
  createdAt?: string | Date;
  _id?: string;
}) {
  const stored = booking.bookingCode?.trim();
  if (!stored) return bookingCodeFor(booking.createdAt, booking._id);
  return stored.startsWith("#") ? stored : `#${stored.replace(/^RY/i, "RY")}`;
}

export function initials(name?: string | null) {
  if (!name) return "R";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function truncate(value: string, length = 80) {
  return value.length > length ? `${value.slice(0, length - 1)}…` : value;
}

export function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function maskAccount(accountNumber?: string) {
  if (!accountNumber) return "-";
  return `•••• ${accountNumber.slice(-4)}`;
}

export function rupeesToPaise(amount: number) {
  return Math.round(amount * 100);
}

export function serialize<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}
