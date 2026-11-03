import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@rydex/backend/lib/db";
import { Booking } from "@rydex/backend/models/booking.model";
import { Vehicle } from "@rydex/backend/models/vehicle.model";
import { handleApiError, jsonError, requireUser } from "@rydex/backend/lib/auth-helpers";
import { getRazorpay, razorpayConfigured, verifyRazorpaySignature } from "@rydex/backend/lib/razorpay";
import { sendBookingStatusEmail } from "@rydex/backend/lib/email";
import { emitSocketEvent, bookingRoom, userRoom } from "@rydex/backend/lib/socket";
import { CATEGORY_MAP } from "@rydex/shared/constants";
import type { VehicleCategory } from "@rydex/shared/types";

const schema = z.object({
  bookingId: z.string().min(1),
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    if (!razorpayConfigured()) return jsonError("Online payments are not configured.", 503);
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return jsonError("Payment verification data is incomplete.", 422);

    await connectDB();
    const booking = await Booking.findById(parsed.data.bookingId);
    if (!booking) return jsonError("Booking not found.", 404);
    if (String(booking.user) !== String(user._id)) return jsonError("This is not your booking.", 403);
    if (booking.paymentStatus === "paid") {
      return NextResponse.json({ ok: true, alreadyPaid: true });
    }
    if (booking.razorpayOrderId !== parsed.data.razorpay_order_id) {
      return jsonError("Payment order does not match this booking.", 409);
    }
    if (
      !verifyRazorpaySignature(
        parsed.data.razorpay_order_id,
        parsed.data.razorpay_payment_id,
        parsed.data.razorpay_signature,
      )
    ) {
      return jsonError("Payment signature could not be verified.", 400);
    }

    try {
      const razorpay = getRazorpay();
      const payment = await razorpay.payments.fetch(parsed.data.razorpay_payment_id);
      if (!["captured", "authorized"].includes(String(payment.status))) {
        return jsonError("The payment has not been captured yet. Try again in a moment.", 409);
      }
    } catch (verifyError) {
      console.warn("[razorpay] could not fetch payment status:", verifyError);
    }

    booking.paymentStatus = "paid";
    booking.razorpayPaymentId = parsed.data.razorpay_payment_id;
    await booking.save();

    await sendBookingStatusEmail(
      user.email,
      user.name,
      "Payment confirmed",
      `We received your payment of ₹${booking.fare.total}. Your ride request is now live with nearby partners.`,
      { label: "View booking", url: `${process.env.AUTH_URL || "http://localhost:3000"}/bookings/${booking._id}` },
    ).catch(console.warn);

    const payload = { bookingId: String(booking._id), status: booking.status, paymentStatus: "paid" };
    emitSocketEvent(bookingRoom(String(booking._id)), "booking:update", payload);
    emitSocketEvent(userRoom(String(booking.user)), "booking:update", payload);
    if (booking.partner) {
      emitSocketEvent(userRoom(String(booking.partner)), "booking:update", payload);
    }

    // Online bookings are only broadcast after the payment is confirmed so
    // partners never receive a request they can't accept yet.
    if (booking.status === "pending") {
      const vehicle = booking.vehicle
        ? await Vehicle.findById(booking.vehicle)
            .select("name category image registrationNumber")
            .lean()
        : null;
      const requestPayload = {
        bookingId: String(booking._id),
        category: booking.category,
        categoryLabel: CATEGORY_MAP[booking.category as VehicleCategory]?.label || "Ride",
        image: vehicle?.image,
        ...(vehicle
          ? {
              vehicle: {
                name: vehicle.name,
                category: vehicle.category,
                image: vehicle.image,
                registrationNumber: vehicle.registrationNumber,
              },
            }
          : {}),
        rider: {
          name: user.name,
          phone: user.phone,
          rating: 5,
        },
        pickup: booking.pickup,
        drop: booking.drop,
        distanceKm: booking.distanceKm,
        durationMin: booking.durationMin,
        fare: booking.fare.total,
        partnerEarning: booking.fare.partnerEarning,
        paymentMethod: booking.paymentMethod,
        paymentStatus: "paid",
        scheduled: booking.scheduled,
        date: booking.date,
        time: booking.time,
        requestedAt: new Date().toISOString(),
      };

      for (const partnerId of booking.notifiedPartners || []) {
        emitSocketEvent(userRoom(String(partnerId)), "ride:request", requestPayload);
      }
    }

    return NextResponse.json({ ok: true, paid: true });
  } catch (error) {
    return handleApiError(error);
  }
}
