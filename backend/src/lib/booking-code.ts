import { randomInt } from "crypto";
import mongoose from "mongoose";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const DEFAULT_DB_SERIAL = "XYZ123";

/**
 * Serial of the database that owns the booking.
 * Set RYDEX_DB_SERIAL in .env (e.g. XYZ123). When multiple databases run the
 * same app in the future, each gets its own serial so references never collide.
 */
function dbSerial() {
  const serial = (process.env.RYDEX_DB_SERIAL || DEFAULT_DB_SERIAL)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  return serial || DEFAULT_DB_SERIAL;
}

/** Four character alphanumeric suffix, e.g. C2Q3. */
function randomSuffix() {
  let out = "";
  for (let i = 0; i < 4; i += 1) {
    out += ALPHABET[randomInt(0, ALPHABET.length)];
  }
  return out;
}

/**
 * Booking reference format: #RY+db serial+ride sequence+XXXX
 *   #RY      - RYDEX prefix
 *   serial   - serial of the database the booking was created in
 *   sequence - per-database ride counter, zero-padded to 5 digits
 *   XXXX     - random alphanumeric suffix, assigned first so parallel
 *              bookings in the same second never share a reference
 *
 * Example: #RYXYZ12300012C2Q3
 */
export function composeBookingCode(sequence: number, suffix: string = randomSuffix()) {
  return `#RY${dbSerial()}${String(Math.max(1, Math.floor(sequence))).padStart(5, "0")}${suffix}`;
}

/** The counters collection - requires an open connection before use. */
function countersCollection() {
  if (!mongoose.connection.db) {
    throw new Error("Database connection required before generating booking codes.");
  }
  return mongoose.connection.db.collection<{ _id: string; seq: number }>("counters");
}

/** Atomically reserves the next ride sequence for this database. */
export async function reserveBookingSequence() {
  const counters = countersCollection();
  const updated = await counters.findOneAndUpdate(
    { _id: "booking" },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" },
  );
  // Driver version differences: newer drivers return the doc directly.
  const doc = updated && "value" in (updated as Record<string, unknown>)
    ? ((updated as Record<string, unknown>).value as { seq?: number } | null)
    : (updated as { seq?: number } | null);
  const seq = Number(doc?.seq ?? 0);
  return seq > 0 ? seq : 1;
}

/** Builds a fresh booking code in the current scheme. */
export async function nextBookingCode() {
  return composeBookingCode(await reserveBookingSequence());
}

/** Keeps the ride counter ahead of demo/backfilled codes (seed scripts). */
export async function bumpBookingCounter(min: number) {
  const counters = countersCollection();
  await counters.updateOne({ _id: "booking" }, { $max: { seq: min } }, { upsert: true });
}
