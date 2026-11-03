import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { connectDB } from "@rydex/backend/lib/db";
import { Booking } from "@rydex/backend/models/booking.model";
import { handleApiError, jsonError, requireUser } from "@rydex/backend/lib/auth-helpers";
import { generateOtp, hashOtp } from "@rydex/backend/lib/otp";

const schema = z.object({ type: z.enum(["pickup", "drop"]) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return jsonError("Booking not found.", 404);
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return jsonError("Choose pickup or drop OTP.", 422);

    await connectDB();
    const booking = await Booking.findById(id).select(
      "+pickupOtpHash +dropOtpHash +pickupOtpCode +dropOtpCode",
    );
    if (!booking) return jsonError("Booking not found.", 404);
    if (String(booking.user) !== String(user._id) && user.role !== "admin") {
      return jsonError("Only the rider can refresh this OTP.", 403);
    }

    if (parsed.data.type === "pickup" && !["accepted", "arrived"].includes(booking.status)) {
      return jsonError("The pickup OTP isn't available for this ride right now.", 409);
    }
    if (parsed.data.type === "drop" && booking.status !== "started") {
      return jsonError("The drop OTP becomes available after the ride starts.", 409);
    }

    const otp = generateOtp(4);
    if (parsed.data.type === "pickup") {
      booking.pickupOtpHash = hashOtp(otp);
      booking.pickupOtpCode = otp;
    } else {
      booking.dropOtpHash = hashOtp(otp);
      booking.dropOtpCode = otp;
    }
    await booking.save();

    return NextResponse.json({ ok: true, otp });
  } catch (error) {
    return handleApiError(error);
  }
}
