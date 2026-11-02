import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@rydex/backend/lib/db";
import { Booking } from "@rydex/backend/models/booking.model";
import { Vehicle } from "@rydex/backend/models/vehicle.model";
import { User } from "@rydex/backend/models/user.model";
import { requireUser, handleApiError, jsonError, parsePagination } from "@rydex/backend/lib/auth-helpers";
import { bookingSchema } from "@rydex/shared/validation";
import { calculateFare } from "@rydex/shared/fare";
import { generateOtp, hashOtp } from "@rydex/backend/lib/otp";
import { getRoadRoute, isFutureRide } from "@rydex/backend/lib/route";
import { sendBookingStatusEmail, sendRideOtpEmail } from "@rydex/backend/lib/email";
import { emitSocketEvent, userRoom } from "@rydex/backend/lib/socket";
import { clientIp, rateLimit } from "@rydex/backend/lib/rate-limit";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    await connectDB();
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(request.url, 20);
    const as = searchParams.get("as") || "user";
    const statusParam = searchParams.get("status");
    const filter: Record<string, unknown> = {};

    if (as === "partner") {
      if (user.role !== "partner" && user.role !== "admin") {
        return jsonError("Partner access only.", 403);
      }
      filter.partner = user._id;
    } else if (as === "admin") {
      if (user.role !== "admin") return jsonError("Admin access only.", 403);
    } else {
      filter.user = user._id;
    }

    if (statusParam) {
      const statuses = statusParam.split(",").filter((s) =>
        ["pending", "accepted", "rejected", "cancelled", "arrived", "started", "completed"].includes(s),
      );
      if (statuses.length) filter.status = { $in: statuses };
    }

    const q = searchParams.get("q")?.trim();
    if (q) {
      const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const search: Array<Record<string, unknown>> = [
        { "pickup.address": { $regex: safe, $options: "i" } },
        { "drop.address": { $regex: safe, $options: "i" } },
        { date: { $regex: safe, $options: "i" } },
      ];
      if (/^[a-f0-9]{24}$/i.test(q)) search.push({ _id: q });
      filter.$and = [{ $or: search }];
    }

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .select("-messages")
        .populate("vehicle", "name image category registrationNumber brand model")
        .populate("user", "name email phone image")
        .populate("partner", "name email phone image partnerProfile.businessName")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Booking.countDocuments(filter),
    ]);

    return NextResponse.json({
      ok: true,
      bookings,
      pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const limit = rateLimit(`booking:${clientIp(request)}`, 8, 60_000);
    if (!limit.allowed) return jsonError("Too many booking attempts. Please wait a minute.", 429);

    const parsed = bookingSchema.safeParse(await request.json());
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message || "Check your booking details.", 422);
    }
    const data = parsed.data;
    if (!isFutureRide(data.date, data.time)) {
      return jsonError("Choose a pickup date and time at least 5 minutes in the future.", 422);
    }

    await connectDB();
    if (!mongoose.isValidObjectId(data.vehicleId)) return jsonError("Vehicle not found.", 404);
    const vehicle = await Vehicle.findById(data.vehicleId).populate(
      "owner",
      "name email phone partnerStatus role",
    );
    if (!vehicle || !vehicle.approved || !vehicle.available) {
      return jsonError("This vehicle is no longer available.", 409);
    }
    const owner = vehicle.owner as unknown as {
      _id: mongoose.Types.ObjectId;
      name: string;
      email: string;
    };
    if (!owner || String(owner._id) === String(user._id)) {
      return jsonError("You cannot book your own vehicle.", 403);
    }

    const route = await getRoadRoute(data.pickup, data.drop);
    const fare = calculateFare({
      distanceKm: route.distanceKm,
      durationMin: route.durationMin,
      baseFare: vehicle.baseFare,
      pricePerKm: vehicle.pricePerKm,
      pricePerHour: vehicle.pricePerHour,
      minimumFare: vehicle.minimumFare,
    });

    const pickupOtp = generateOtp(4);
    const booking = await Booking.create({
      user: user._id,
      partner: owner._id,
      vehicle: vehicle._id,
      category: vehicle.category,
      pickup: data.pickup,
      drop: data.drop,
      date: data.date,
      time: data.time,
      distanceKm: route.distanceKm,
      durationMin: route.durationMin,
      fare,
      paymentMethod: data.paymentMethod,
      paymentStatus: "pending",
      status: "pending",
      pickupOtpHash: hashOtp(pickupOtp),
      notes: data.notes || "",
    });

    await sendRideOtpEmail(user.email, user.name, "pickup", pickupOtp, vehicle.name).catch(console.warn);
    await sendBookingStatusEmail(
      user.email,
      user.name,
      "Booking request sent",
      `Your request for ${vehicle.name} is with the partner. We'll email you as soon as it's accepted.`,
      { label: "View booking", url: `${process.env.AUTH_URL || "http://localhost:3000"}/bookings/${booking._id}` },
    ).catch(console.warn);
    await sendBookingStatusEmail(
      owner.email,
      owner.name,
      "New ride request",
      `${user.name} wants to book your ${vehicle.name}. Review the request in your partner dashboard.`,
      { label: "View request", url: `${process.env.AUTH_URL || "http://localhost:3000"}/dashboard/partner/requests` },
    ).catch(console.warn);

    // Standard booking notification
    emitSocketEvent(userRoom(String(owner._id)), "booking:new", {
      bookingId: String(booking._id),
      vehicle: vehicle.name,
      total: fare.total,
      pickup: data.pickup.address,
      drop: data.drop.address,
    });

    // Flash notification for partner with full ride details
    emitSocketEvent(userRoom(String(owner._id)), "ride:request", {
      bookingId: String(booking._id),
      vehicle: {
        name: vehicle.name,
        category: vehicle.category,
        image: vehicle.image,
        registrationNumber: vehicle.registrationNumber,
      },
      rider: {
        name: user.name,
        phone: user.phone,
        rating: 5, // TODO: add rider rating
      },
      pickup: data.pickup,
      drop: data.drop,
      distanceKm: route.distanceKm,
      durationMin: route.durationMin,
      fare: fare.total,
      partnerEarning: fare.partnerEarning,
      paymentMethod: data.paymentMethod,
      requestedAt: new Date().toISOString(),
    });

    const admins = await User.find({ role: "admin" }).select("_id").lean();
    for (const admin of admins) {
      emitSocketEvent(userRoom(String(admin._id)), "booking:new", {
        bookingId: String(booking._id),
        total: fare.total,
      });
    }

    return NextResponse.json(
      {
        ok: true,
        booking: {
          _id: String(booking._id),
          fare,
          distanceKm: route.distanceKm,
          durationMin: route.durationMin,
          paymentMethod: data.paymentMethod,
          routeProvider: route.provider,
        },
        ...(process.env.NODE_ENV !== "production" ? { devPickupOtp: pickupOtp } : {}),
      },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
