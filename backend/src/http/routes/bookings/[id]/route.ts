import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@rydex/backend/lib/db";
import { Booking } from "@rydex/backend/models/booking.model";
import { requireUser, handleApiError, jsonError } from "@rydex/backend/lib/auth-helpers";
import { updateBookingStatusSchema, ratingSchema } from "@rydex/shared/validation";
import { generateOtp, hashOtp, verifyOtp } from "@rydex/backend/lib/otp";
import { sendBookingStatusEmail, sendRideOtpEmail } from "@rydex/backend/lib/email";
import { emitSocketEvent, bookingRoom, userRoom } from "@rydex/backend/lib/socket";
import { refundPayment } from "@rydex/backend/lib/razorpay";
import { Vehicle } from "@rydex/backend/models/vehicle.model";

async function loadBooking(id: string) {
  if (!mongoose.isValidObjectId(id)) return null;
  await connectDB();
  return Booking.findById(id)
    .select("+pickupOtpHash +dropOtpHash")
    .populate("vehicle", "name image category registrationNumber brand model owner")
    .populate("user", "name email phone image")
    .populate("partner", "name email phone image partnerProfile.businessName")
    .populate("messages.sender", "name image role");
}

interface BookingRelations {
  _id: unknown;
  user: unknown;
  partner: unknown;
}

interface PopulatedUser {
  name?: string;
  email?: string;
  partnerProfile?: { businessName?: string };
}

/** Populate returns a document for each ref; fall back to the raw id. */
function refId(value: unknown) {
  if (value && typeof value === "object" && "_id" in value) {
    return String((value as { _id: unknown })._id);
  }
  return String(value);
}

function isParticipant(booking: BookingRelations, userId: string) {
  return refId(booking.user) === userId || refId(booking.partner) === userId;
}

function notify(booking: BookingRelations, status: string, extra: Record<string, unknown> = {}) {
  const payload = { bookingId: String(booking._id), status, ...extra };
  emitSocketEvent(bookingRoom(String(booking._id)), "booking:update", payload);
  emitSocketEvent(userRoom(refId(booking.user)), "booking:update", payload);
  emitSocketEvent(userRoom(refId(booking.partner)), "booking:update", payload);
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const booking = await loadBooking(id);
    if (!booking) return jsonError("Booking not found.", 404);
    if (!isParticipant(booking, String(user._id)) && user.role !== "admin") {
      return jsonError("You do not have access to this ride.", 403);
    }
    return NextResponse.json({
      ok: true,
      booking,
      viewerRole:
        user.role === "admin"
          ? "admin"
          : refId(booking.partner) === String(user._id)
            ? "partner"
            : "user",
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const booking = await loadBooking(id);
    if (!booking) return jsonError("Booking not found.", 404);

    const isRider = refId(booking.user) === String(user._id);
    const isPartner = refId(booking.partner) === String(user._id);
    const isAdmin = user.role === "admin";
    if (!isRider && !isPartner && !isAdmin) {
      return jsonError("You do not have access to this ride.", 403);
    }

    // Rating is handled separately but accepted here for the completed state UI.
    const body = await request.json();
    if (body?.rating !== undefined && !body?.status) {
      if (!isRider && !isAdmin) return jsonError("Only the rider can rate a trip.", 403);
      if (booking.status !== "completed") return jsonError("You can rate after the ride is completed.", 409);
      if (booking.rating) return jsonError("This ride has already been rated.", 409);
      const parsed = ratingSchema.safeParse(body);
      if (!parsed.success) return jsonError("Choose a rating from 1 to 5.", 422);
      booking.rating = parsed.data.rating;
      booking.review = parsed.data.review || "";
      await booking.save();
      const vehicle = await Vehicle.findById(booking.vehicle);
      if (vehicle) {
        const trips = Math.max(1, vehicle.totalTrips);
        vehicle.rating =
          Math.round(((vehicle.rating * (trips - 1) + parsed.data.rating) / trips) * 10) / 10;
        await vehicle.save();
      }
      notify(booking, "rated", { rating: parsed.data.rating });
      return NextResponse.json({ ok: true, rating: booking.rating });
    }

    const parsed = updateBookingStatusSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message || "Invalid booking update.", 422);
    }
    const { status, reason, otp } = parsed.data;
    const appUrl = process.env.AUTH_URL || "http://localhost:3000";
    const rider = booking.user as unknown as PopulatedUser;
    const partner = booking.partner as unknown as PopulatedUser;
    const vehicleName = (booking.vehicle as unknown as { name?: string } | null)?.name || "your vehicle";

    if (status === "accepted") {
      if (!isPartner && !isAdmin) return jsonError("Only the partner can accept a ride.", 403);
      if (booking.status !== "pending") return jsonError("This request is no longer pending.", 409);
      if (booking.paymentMethod === "online" && booking.paymentStatus !== "paid") {
        return jsonError("The rider's online payment is still pending.", 409);
      }
      booking.status = "accepted";
      await booking.save();
      await sendBookingStatusEmail(
        rider.email || "",
        rider.name || "there",
        "Your ride is confirmed",
        `${partner.partnerProfile?.businessName || partner.name || "Your partner"} accepted your ${vehicleName} booking. Your pickup OTP is valid for this ride.`,
        { label: "View ride", url: `${appUrl}/bookings/${booking._id}` },
      ).catch(console.warn);
      notify(booking, "accepted");
      return NextResponse.json({ ok: true, status: booking.status });
    }

    if (status === "rejected") {
      if (!isPartner && !isAdmin) return jsonError("Only the partner can reject a ride.", 403);
      if (booking.status !== "pending") return jsonError("This request is no longer pending.", 409);
      if (!reason) return jsonError("Tell the rider why you can't take this booking.", 422);
      booking.status = "rejected";
      booking.rejectionReason = reason;
      await booking.save();
      if (booking.paymentStatus === "paid" && booking.paymentMethod === "online") {
        await refundPayment(booking.razorpayPaymentId, booking.fare.total).catch(console.warn);
        booking.paymentStatus = "refunded";
        await booking.save();
      }
      await sendBookingStatusEmail(
        rider.email || "",
        rider.name || "there",
        "Partner couldn't take your booking",
        `The partner declined your request. Reason: ${reason}. You can book another vehicle from your dashboard.`,
        { label: "Find another ride", url: `${appUrl}/book` },
      ).catch(console.warn);
      notify(booking, "rejected", { reason });
      return NextResponse.json({ ok: true, status: booking.status });
    }

    if (status === "cancelled") {
      if (!isRider && !isAdmin) return jsonError("Only the rider can cancel a ride.", 403);
      if (!["pending", "accepted", "arrived"].includes(booking.status)) {
        return jsonError("This ride can no longer be cancelled.", 409);
      }
      booking.status = "cancelled";
      booking.cancelledAt = new Date();
      if (booking.paymentStatus === "paid" && booking.paymentMethod === "online") {
        await refundPayment(booking.razorpayPaymentId, booking.fare.total).catch(console.warn);
        booking.paymentStatus = "refunded";
      }
      await booking.save();
      await sendBookingStatusEmail(
        partner.email || "",
        partner.name || "there",
        "Ride cancelled",
        `A rider cancelled their ${vehicleName} booking.`,
        { label: "Open dashboard", url: `${appUrl}/dashboard/partner` },
      ).catch(console.warn);
      notify(booking, "cancelled");
      return NextResponse.json({ ok: true, status: booking.status });
    }

    if (!isPartner && !isAdmin) return jsonError("Only the partner can update this ride.", 403);

    if (status === "arrived") {
      if (booking.status !== "accepted") return jsonError("Accept the ride first.", 409);
      booking.status = "arrived";
      await booking.save();
      notify(booking, "arrived");
      return NextResponse.json({ ok: true, status: booking.status });
    }

    if (status === "started") {
      if (!["accepted", "arrived"].includes(booking.status)) {
        return jsonError("This ride cannot be started yet.", 409);
      }
      if (!otp || !verifyOtp(otp, booking.pickupOtpHash)) {
        return jsonError("The pickup OTP is incorrect. Ask the rider for the 4-digit code.", 422);
      }
      const dropOtp = generateOtp(4);
      booking.status = "started";
      booking.otpVerified.pickup = true;
      booking.rideStartedAt = new Date();
      booking.dropOtpHash = hashOtp(dropOtp);
      await booking.save();
      await sendRideOtpEmail(
        rider.email || "",
        rider.name || "there",
        "drop",
        dropOtp,
        vehicleName,
      ).catch(console.warn);
      notify(booking, "started", { startedAt: booking.rideStartedAt });
      return NextResponse.json({ ok: true, status: booking.status });
    }

    if (status === "completed") {
      if (booking.status !== "started") return jsonError("Start the ride before completing it.", 409);
      if (!otp || !verifyOtp(otp, booking.dropOtpHash)) {
        return jsonError("The drop OTP is incorrect. Ask the rider for the 4-digit code.", 422);
      }
      booking.status = "completed";
      booking.otpVerified.drop = true;
      booking.completedAt = new Date();
      if (booking.paymentMethod === "cash") booking.paymentStatus = "paid";
      await booking.save();
      await Vehicle.updateOne({ _id: booking.vehicle }, { $inc: { totalTrips: 1 } });
      await sendBookingStatusEmail(
        rider.email || "",
        rider.name || "there",
        "Ride completed",
        `Your ${vehicleName} ride is complete. Thanks for riding with RYDEX — we'd love your rating.`,
        { label: "Rate your ride", url: `${appUrl}/bookings/${booking._id}` },
      ).catch(console.warn);
      notify(booking, "completed", { completedAt: booking.completedAt });
      return NextResponse.json({ ok: true, status: booking.status });
    }

    return jsonError("Unsupported status update.", 422);
  } catch (error) {
    return handleApiError(error);
  }
}
