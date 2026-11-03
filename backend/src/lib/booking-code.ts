import { randomInt } from "crypto";
import { formatBookingCode } from "@rydex/shared/utils";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Four character alphanumeric suffix, e.g. 5A74. */
function randomSuffix() {
  let out = "";
  for (let i = 0; i < 4; i += 1) {
    out += ALPHABET[randomInt(0, ALPHABET.length)];
  }
  return out;
}

/**
 * Booking reference format: #RY + ddmmyyyy + hhmmss + XXXX
 *   #RY       - RYDEX prefix
 *   ddmmyyyy  - booking date (IST)
 *   hhmmss    - booking time (IST)
 *   XXXX      - random alphanumeric suffix that keeps every reference unique
 *
 * Example: #RY031120261722055A74
 */
export function newBookingCode(date: Date = new Date()) {
  return formatBookingCode(date, randomSuffix());
}
