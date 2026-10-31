import { createHash, randomInt, timingSafeEqual } from "crypto";

const PEPPER = process.env.AUTH_SECRET || "rydex-development-pepper";

export function generateOtp(length = 6) {
  const min = 10 ** (length - 1);
  const max = 10 ** length - 1;
  return String(randomInt(min, max + 1));
}

export function hashOtp(otp: string) {
  return createHash("sha256").update(`${otp}:${PEPPER}`).digest("hex");
}

export function verifyOtp(otp: string, hash: string | undefined | null) {
  if (!otp || !hash) return false;
  const incoming = Buffer.from(hashOtp(otp));
  const stored = Buffer.from(hash);
  if (incoming.length !== stored.length) return false;
  return timingSafeEqual(incoming, stored);
}

export function otpExpiry(minutes = 10) {
  return new Date(Date.now() + minutes * 60_000);
}
