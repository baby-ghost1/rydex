import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@rydex/backend/lib/db";
import { Booking } from "@rydex/backend/models/booking.model";
import { requireUser, handleApiError, jsonError } from "@rydex/backend/lib/auth-helpers";
import { updateBookingStatusSchema, ratingSchema } from "@rydex/shared/validation";
import { generateOtp, hashOtp, verifyOtp } from "@rydex/backend/lib/otp";
import { sendBookingStatusEmail } from "@rydex/backend/lib/email";
import { emitSocketEvent, bookingRoom, userRoom } from "@rydex/backend/lib/socket";
import { refundPayment } from "@rydex/backend/lib/razorpay";
import { Vehicle } from "@rydex/backend/models/vehicle.model";
import { CATEGORY_MAP } from "@rydex/shared/constants";
import type { VehicleCategory } from "@rydex/shared/types";

async function loadBooking(id: string) {
  if (!mongoose.isValidObjectId(id)) return null;
  await connectDB();
  return Booking.findById(id)
    .select("+pickupOtpHash +dropOtpHash +pickupOtpCode +dropOtpCode")
    .populate("vehicle", "name image category registrationNumber brand model owner")
    .populate("user", "name email phone image")
    .populate("partner", "name email phone image partnerProfile.businessName")
    .populate("messages.sender", "name image role");
}

interface BookingRelations {
  _id: unknown;
  user: unknown;
  partner: unknown;
  vehicle?: unknown;
  category: VehicleCategory;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  notifiedPartners?: unknown[];
}

interface PopulatedUser {
  name?: string;
  email?: string;
  partnerProfile?: { businessName?: string };
}

/** Populate returns a document for each ref; fall back to the raw id. */
function refId(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object" && "_id" in value) {
    return String((value as { _id: unknown })._id);
  }
  return String(value);
}

function notify(booking: BookingRelations, status: string, extra: Record<string, unknown> = {}) {
  const payload = { bookingId: String(booking._id), status, ...extra };
  emitSocketEvent(bookingRoom(String(booking._id)), "booking:update", payload);
  emitSocketEvent(userRoom(refId(booking.user)), "booking:update", payload);
  const partnerId = refId(booking.partner);
  if (partnerId) emitSocketEvent(userRoom(partnerId), "booking:update", payload);
}

function closeBroadcast(
  booking: BookingRelations,
  winnerId?: string,
  status: "accepted" | "cancelled" = "accepted",
) {
  for (const partner of booking.notifiedPartners || []) {
    const id = refId(partner);
    if (!id || id === winnerId) continue;
    emitSocketEvent(userRoom(id), "ride:closed", {
      bookingId: String(booking._id),
      status,
    });
  }
}

async function canPartnerPreview(booking: BookingRelations, userId: string) {
  if (booking.partner || booking.status !== "pending" || !booking.category) return false;

  const notified = booking.notifiedPartners || [];
  if (!notified.some((id) => refId(id) === userId)) return false;

  const declines = (booking as unknown as { declines?: Array<{ partner: unknown }> }).declines || [];
  if (declines.some((entry) => refId(entry.partner) === userId)) return false;

  const vehicle = await Vehicle.findOne({
    owner: userId,
    category: booking.category,
    approved: true,
    available: true,
  })
    .select("_id")
    .lean();
  return Boolean(vehicle);
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const booking = await loadBooking(id);
    if (!booking) return jsonError("Booking not found.", 404);

    const userId = String(user._id);
    const isRider = refId(booking.user) === userId;
    const isPartner = Boolean(booking.partner) && refId(booking.partner) === userId;
    let viewerRole: "user" | "partner" | "admin" | null = null;

    if (user.role === "admin") viewerRole = "admin";
    else if (isRider) viewerRole = "user";
    else if (isPartner) viewerRole = "partner";
    else if (await canPartnerPreview(booking, userId)) viewerRole = "partner";

    if (!viewerRole) return jsonError("You do not have access to this ride.", 403);

    const data = booking.toObject() as Record<string, unknown>;
    const pickupCode = data.pickupOtpCode as string | undefined;
    const dropCode = data.dropOtpCode as string | undefined;
    delete data.pickupOtpHash;
    delete data.dropOtpHash;
    delete data.pickupOtpCode;
    delete data.dropOtpCode;

    if (viewerRole === "user" || viewerRole === "admin") {
      if (["accepted", "arrived", "started", "completed"].includes(booking.status)) {
        data.pickupOtp = pickupCode;
      }
      if (["started", "completed"].includes(booking.status)) {
        data.dropOtp = dropCode;
      }
    }

    return NextResponse.json({ ok: true, booking: data, viewerRole });
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

    const userId = String(user._id);
    const isRider = refId(booking.user) === userId;
    const isPartner = Boolean(booking.partner) && refId(booking.partner) === userId;
    const isAdmin = user.role === "admin";
    const openPartner =
      !booking.partner && booking.status === "pending"
        ? await canPartnerPreview(booking, userId)
        : false;

    if (!isRider && !isPartner && !openPartner && !isAdmin) {
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
      if (booking.vehicle) {
        const vehicle = await Vehicle.findById(booking.vehicle);
        if (vehicle) {
          const trips = Math.max(1, vehicle.totalTrips);
          vehicle.rating =
            Math.round(((vehicle.rating * (trips - 1) + parsed.data.rating) / trips) * 10) / 10;
          await vehicle.save();
        }
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
    const populatedPartner = booking.partner as unknown as PopulatedUser | null;
    const bookingCategory = booking.category as VehicleCategory;
    const vehicleName =
      (booking.vehicle as unknown as { name?: string } | null)?.name ||
      `${CATEGORY_MAP[bookingCategory]?.label || "RYDEX"} ride`;

    if (status === "accepted") {
      if (booking.paymentMethod === "online" && booking.paymentStatus !== "paid") {
        return jsonError("The rider's online payment is still pending.", 409);
      }

      if (!booking.partner) {
        // Category broadcast: first eligible partner to hit the atomic update wins.
        if (!openPartner) return jsonError("Only an eligible partner can accept this ride.", 403);

        const vehicle = await Vehicle.findOne({
          owner: user._id,
          category: booking.category,
          approved: true,
          available: true,
        })
          .sort({ rating: -1, totalTrips: -1 })
          .select("_id")
          .lean();
        if (!vehicle) {
          return jsonError("You need an available vehicle in this category to accept.", 409);
        }

        const accepted = await Booking.findOneAndUpdate(
          {
            _id: id,
            status: "pending",
            partner: null,
            "declines.partner": { $ne: user._id },
          },
          { $set: { status: "accepted", partner: user._id, vehicle: vehicle._id } },
          { new: true },
        );
        if (!accepted) {
          return jsonError("Another partner accepted this ride first.", 409);
        }

        booking.status = "accepted";
        booking.partner = user._id;
        booking.vehicle = vehicle._id;
        closeBroadcast(booking, userId);
      } else {
        if (!isPartner && !isAdmin) return jsonError("Only the partner can accept a ride.", 403);
        if (booking.status !== "pending") return jsonError("This request is no longer pending.", 409);
        booking.status = "accepted";
        await booking.save();
      }

      const partnerName = booking.partner
        ? populatedPartner?.partnerProfile?.businessName ||
          populatedPartner?.name ||
          user.partnerProfile?.businessName ||
          user.name
        : user.name;
      await sendBookingStatusEmail(
        rider.email || "",
        rider.name || "there",
        "Your ride is confirmed",
        `${partnerName || "Your partner"} accepted your ${vehicleName} booking. Your pickup OTP is waiting on the ride page.`,
        { label: "View ride", url: `${appUrl}/bookings/${booking._id}` },
      ).catch(console.warn);
      notify(booking, "accepted");
      return NextResponse.json({ ok: true, status: booking.status });
    }

    if (status === "rejected") {
      if (!booking.partner) {
        // A decline on a broadcast only excludes this partner. The ride stays open.
        if (!openPartner) return jsonError("Only an eligible partner can decline this ride.", 403);
        if (booking.status !== "pending") return jsonError("This request is no longer open.", 409);
        if (!reason) return jsonError("Tell the rider why you can't take this booking.", 422);

        const declined = await Booking.findOneAndUpdate(
          {
            _id: id,
            status: "pending",
            partner: null,
            "declines.partner": { $ne: user._id },
          },
          { $push: { declines: { partner: user._id, reason, createdAt: new Date() } } },
          { new: false },
        );
        if (!declined) return jsonError("This request is no longer open.", 409);

        return NextResponse.json({ ok: true, status: "pending", declined: true });
      }

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
      notifiedClose(booking);
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
      if (booking.partner) {
        await sendBookingStatusEmail(
          populatedPartner?.email || "",
          populatedPartner?.name || "there",
          "Ride cancelled",
          `A rider cancelled their ${vehicleName} booking.`,
          { label: "Open dashboard", url: `${appUrl}/dashboard/partner` },
        ).catch(console.warn);
      } else {
        closeBroadcast(booking, undefined, "cancelled");
      }
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
      booking.dropOtpCode = dropOtp;
      await booking.save();
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
      if (booking.vehicle) {
        await Vehicle.updateOne({ _id: booking.vehicle }, { $inc: { totalTrips: 1 } });
      }
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

/** A global rejection/cancellation must also dismiss any partner flash banners. */
function notifiedClose(booking: BookingRelations) {
  for (const partner of booking.notifiedPartners || []) {
    const id = refId(partner);
    if (!id) continue;
    emitSocketEvent(userRoom(id), "ride:closed", {
      bookingId: String(booking._id),
      status: "rejected",
    });
  }
}
