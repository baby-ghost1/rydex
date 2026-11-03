import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@rydex/backend/lib/db";
import { Booking } from "@rydex/backend/models/booking.model";
import { handleApiError, jsonError, requireUser } from "@rydex/backend/lib/auth-helpers";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return jsonError("Booking not found.", 404);
    await connectDB();
    const booking = await Booking.findById(id).select("user partner status").lean();
    if (!booking) return jsonError("Booking not found.", 404);
    const isRider = String(booking.user) === String(user._id);
    const isPartner = String(booking.partner) === String(user._id);
    if (!isRider && !isPartner && user.role !== "admin") {
      return jsonError("You do not have access to this ride.", 403);
    }

    const replies: string[] = [];
    if (isRider) {
      if (booking.status === "accepted") {
        replies.push(
          "I'm at the pickup point.",
          "Please call me when you arrive.",
          "How long until you reach me?",
        );
      } else if (booking.status === "started") {
        replies.push("Please take the fastest route.", "Can we stop for a minute?", "I'm ready at the drop point.");
      } else if (booking.status === "pending") {
        replies.push("Is this booking still available?", "Can you pick me up a little earlier?");
      } else if (booking.status === "completed") {
        replies.push("Thank you for the ride!", "I left something in the vehicle.");
      }
    } else if (isPartner) {
      if (booking.status === "accepted") {
        replies.push(
          "I've arrived at your pickup location.",
          "I'm on my way - see you shortly.",
          "Please share the pickup OTP when I arrive.",
        );
      } else if (booking.status === "started") {
        replies.push("We're on the way to your drop.", "Please share the drop OTP at the destination.", "Traffic is heavy - a few minutes delayed.");
      } else if (booking.status === "pending") {
        replies.push("I can take this ride.", "I'm slightly delayed - is that okay?");
      }
    }

    return NextResponse.json({ ok: true, suggestions: replies });
  } catch (error) {
    return handleApiError(error);
  }
}
