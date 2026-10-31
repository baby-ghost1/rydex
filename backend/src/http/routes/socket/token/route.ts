import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireUser, handleApiError, jsonError } from "@rydex/backend/lib/auth-helpers";
import { connectDB } from "@rydex/backend/lib/db";
import { Booking } from "@rydex/backend/models/booking.model";
import { signSocketToken, socketPublicUrl } from "@rydex/backend/lib/socket";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get("bookingId");
    if (bookingId) {
      if (!mongoose.isValidObjectId(bookingId)) return jsonError("Booking not found.", 404);
      await connectDB();
      const booking = await Booking.findById(bookingId).select("user partner").lean();
      if (!booking) return jsonError("Booking not found.", 404);
      const allowed =
        user.role === "admin" ||
        String(booking.user) === String(user._id) ||
        String(booking.partner) === String(user._id);
      if (!allowed) return jsonError("You do not have access to this ride.", 403);
    }
    const token = signSocketToken(String(user._id), bookingId || undefined);
    return NextResponse.json({ ok: true, ...token, url: socketPublicUrl() });
  } catch (error) {
    return handleApiError(error);
  }
}
