import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { connectDB } from "@rydex/backend/lib/db";
import { Booking } from "@rydex/backend/models/booking.model";
import { handleApiError, jsonError, requireUser } from "@rydex/backend/lib/auth-helpers";
import { emitSocketEvent, bookingRoom } from "@rydex/backend/lib/socket";
import { clientIp, rateLimit } from "@rydex/backend/lib/rate-limit";

const schema = z.object({
  text: z.string().trim().min(1, "Type a message").max(1000),
});

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return jsonError("Booking not found.", 404);
    await connectDB();
    const booking = await Booking.findById(id)
      .select("user partner messages")
      .populate("messages.sender", "name image role")
      .lean();
    if (!booking) return jsonError("Booking not found.", 404);
    if (
      user.role !== "admin" &&
      String(booking.user) !== String(user._id) &&
      String(booking.partner) !== String(user._id)
    ) {
      return jsonError("You do not have access to this chat.", 403);
    }
    return NextResponse.json({ ok: true, messages: booking.messages });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const limit = rateLimit(`chat:${clientIp(request)}:${user._id}`, 40, 60_000);
    if (!limit.allowed) return jsonError("You're sending messages too quickly.", 429);
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return jsonError("Booking not found.", 404);
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return jsonError(parsed.error.issues[0]?.message || "Type a message.", 422);

    await connectDB();
    // Lean read for the access check — we don't need the whole document here.
    const booking = await Booking.findById(id)
      .select("user partner status")
      .lean();
    if (!booking) return jsonError("Booking not found.", 404);
    if (
      String(booking.user) !== String(user._id) &&
      String(booking.partner) !== String(user._id) &&
      user.role !== "admin"
    ) {
      return jsonError("You do not have access to this chat.", 403);
    }
    if (["cancelled", "rejected"].includes(booking.status)) {
      return jsonError("This ride is closed. Chat is no longer available.", 409);
    }

    const createdAt = new Date();
    const message = {
      _id: new mongoose.Types.ObjectId(),
      sender: user._id,
      text: parsed.data.text,
      createdAt,
    };
    // Single atomic write instead of loading/re-saving the whole document.
    await Booking.updateOne(
      { _id: id },
      { $push: { messages: message }, $set: { updatedAt: createdAt } },
    );
    const payload = {
      _id: String(message._id),
      sender: { _id: String(user._id), name: user.name, image: user.image || "", role: user.role },
      text: message.text,
      createdAt,
    };
    // Await the emit so serverless freezes don't drop the realtime delivery.
    await emitSocketEvent(bookingRoom(String(id)), "chat:message", {
      bookingId: String(id),
      message: payload,
    });
    return NextResponse.json({ ok: true, message: payload }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
