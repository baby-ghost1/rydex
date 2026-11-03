// Standalone script: load the repository .env before importing modules that
// read process.env at module scope (for example lib/db.ts).
import "../lib/env";

import mongoose from "mongoose";
import { connectDB } from "../lib/db";
import { Booking } from "../models/booking.model";
import { newBookingCode } from "../lib/booking-code";

/**
 * Gives every booking that predates the booking-code feature a reference.
 * Safe to run more than once - bookings that already have a code are skipped.
 */
async function main() {
  await connectDB();

  const missing = await Booking.find({ $or: [{ bookingCode: { $exists: false } }, { bookingCode: "" }] })
    .select("_id createdAt")
    .lean();

  if (!missing.length) {
    console.log("Every booking already has a booking code.");
    await mongoose.disconnect();
    return;
  }

  const used = new Set(
    (
      await Booking.find({ bookingCode: { $exists: true, $ne: "" } })
        .select("bookingCode")
        .lean()
    ).map((booking) => booking.bookingCode as string),
  );

  let assigned = 0;
  for (const booking of missing) {
    let code = newBookingCode(booking.createdAt as Date);
    while (used.has(code)) code = newBookingCode(booking.createdAt as Date);
    used.add(code);
    await Booking.updateOne({ _id: booking._id }, { $set: { bookingCode: code } });
    assigned += 1;
  }

  console.log(`Assigned booking codes to ${assigned} booking(s).`);
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : error);
  await mongoose.disconnect();
  process.exit(1);
});
