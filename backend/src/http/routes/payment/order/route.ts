import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@rydex/backend/lib/db";
import { Booking } from "@rydex/backend/models/booking.model";
import { handleApiError, jsonError, requireUser } from "@rydex/backend/lib/auth-helpers";
import { getRazorpay, razorpayConfigured } from "@rydex/backend/lib/razorpay";
import { rupeesToPaise } from "@rydex/shared/utils";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    if (!razorpayConfigured()) {
      return jsonError("Online payments aren't available right now. Choose cash to book.", 503);
    }
    const { bookingId } = await request.json();
    if (!mongoose.isValidObjectId(bookingId)) return jsonError("Booking not found.", 404);
    await connectDB();
    const booking = await Booking.findById(bookingId);
    if (!booking) return jsonError("Booking not found.", 404);
    if (String(booking.user) !== String(user._id)) return jsonError("This is not your booking.", 403);
    if (booking.paymentMethod !== "online") return jsonError("This booking is set to cash payment.", 409);
    if (booking.paymentStatus === "paid") return jsonError("This booking is already paid.", 409);
    if (booking.status !== "pending") return jsonError("This booking can no longer be paid.", 409);

    const razorpay = getRazorpay();
    let orderId = booking.razorpayOrderId;
    let amount = rupeesToPaise(booking.fare.total);

    if (!orderId) {
      const order = await razorpay.orders.create({
        amount,
        currency: "INR",
        receipt: `rydex_${String(booking._id)}`,
        notes: {
          bookingId: String(booking._id),
          vehicle: String(booking.vehicle),
        },
      });
      orderId = order.id;
      amount = Number(order.amount);
      booking.razorpayOrderId = orderId;
      await booking.save();
    }

    return NextResponse.json({
      ok: true,
      order: {
        id: orderId,
        amount,
        currency: "INR",
        keyId: process.env.RAZORPAY_KEY_ID,
        name: "RYDEX Mobility",
        description: "Vehicle booking payment",
        bookingId: String(booking._id),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
