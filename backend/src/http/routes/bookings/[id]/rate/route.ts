import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@rydex/backend/lib/db";
import { Booking } from "@rydex/backend/models/booking.model";
import { handleApiError, jsonError, requireUser } from "@rydex/backend/lib/auth-helpers";
import { z } from "zod";

const rateSchema = z.object({ rating: z.coerce.number().min(1).max(5), review: z.string().trim().max(500).optional() });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return jsonError("Booking not found.", 404);
    const parsed = rateSchema.safeParse(await request.json());
    if (!parsed.success) return jsonError("Choose a rating from 1 to 5.", 422);
    await connectDB();
    const booking = await Booking.findById(id);
    if (!booking) return jsonError("Booking not found.", 404);
    if (String(booking.user) !== String(user._id)) return jsonError("Only the rider can rate this ride.", 403);
    if (booking.status !== "completed") return jsonError("You can rate after the ride is completed.", 409);
    if (booking.rating) return jsonError("This ride has already been rated.", 409);
    booking.rating = parsed.data.rating;
    booking.review = parsed.data.review || "";
    await booking.save();
    const { Vehicle } = await import("@rydex/backend/models/vehicle.model");
    const vehicle = await Vehicle.findById(booking.vehicle);
    if (vehicle) {
      const trips = Math.max(1, vehicle.totalTrips);
      vehicle.rating =
        Math.round(((vehicle.rating * (trips - 1) + parsed.data.rating) / trips) * 10) / 10;
      await vehicle.save();
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
