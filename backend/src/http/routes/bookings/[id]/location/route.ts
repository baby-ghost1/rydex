import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { connectDB } from "@rydex/backend/lib/db";
import { Booking } from "@rydex/backend/models/booking.model";
import { handleApiError, jsonError, requireUser } from "@rydex/backend/lib/auth-helpers";
import { emitSocketEvent, bookingRoom } from "@rydex/backend/lib/socket";
import { clientIp, rateLimit } from "@rydex/backend/lib/rate-limit";

const schema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const limit = rateLimit(`location:${clientIp(request)}:${user._id}`, 120, 60_000);
    if (!limit.allowed) return jsonError("Location updates are too frequent.", 429);
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return jsonError("Booking not found.", 404);
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return jsonError("Valid coordinates are required.", 422);

    await connectDB();
    const booking = await Booking.findById(id).select("partner status user");
    if (!booking) return jsonError("Booking not found.", 404);
    if (user.role !== "admin" && String(booking.partner) !== String(user._id)) {
      return jsonError("Only the assigned partner can update the live location.", 403);
    }
    if (!["accepted", "arrived", "started"].includes(booking.status)) {
      return jsonError("Live location is only shared during an active ride.", 409);
    }

    booking.partnerLocation = { ...parsed.data, updatedAt: new Date() };
    await booking.save();
    const payload = {
      bookingId: String(booking._id),
      lat: parsed.data.lat,
      lng: parsed.data.lng,
      updatedAt: new Date().toISOString(),
    };
    emitSocketEvent(bookingRoom(String(booking._id)), "booking:location", payload);
    emitSocketEvent(`user:${booking.user}`, "booking:location", payload);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
