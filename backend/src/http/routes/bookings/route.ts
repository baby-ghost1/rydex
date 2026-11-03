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
import { sendBookingStatusEmail } from "@rydex/backend/lib/email";
import { emitSocketEvent, userRoom } from "@rydex/backend/lib/socket";
import { clientIp, rateLimit } from "@rydex/backend/lib/rate-limit";
import { CATEGORY_MAP } from "@rydex/shared/constants";
import { findEligibleVehicles, partnerAvailableFor } from "@rydex/backend/lib/eligible-vehicles";
import type { VehicleCategory } from "@rydex/shared/types";

const BOOKING_STATUSES = [
  "pending",
  "accepted",
  "rejected",
  "cancelled",
  "arrived",
  "started",
  "completed",
] as const;

function parseStatuses(raw: string | null) {
  if (!raw) return [] as string[];
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter((value) => (BOOKING_STATUSES as readonly string[]).includes(value));
}

function nowRideDateTime() {
  const now = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  return {
    date: now.toISOString().slice(0, 10),
    time: now.toISOString().slice(11, 16),
  };
}

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    await connectDB();
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(request.url, 20);
    const as = searchParams.get("as") || "user";
    const statuses = parseStatuses(searchParams.get("status"));
    const q = searchParams.get("q")?.trim();

    const searchOr: Array<Record<string, unknown>> = [];
    if (q) {
      const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      searchOr.push(
        { "pickup.address": { $regex: safe, $options: "i" } },
        { "drop.address": { $regex: safe, $options: "i" } },
        { date: { $regex: safe, $options: "i" } },
      );
      if (/^[a-f0-9]{24}$/i.test(q)) searchOr.push({ _id: q });
    }

    const applyCommonFilters = (filter: Record<string, unknown>) => {
      if (statuses.length) filter.status = { $in: statuses };
      if (searchOr.length) filter.$and = [{ $or: searchOr }];
      return filter;
    };

    const populate = (query: ReturnType<typeof Booking.find>) =>
      query
        .select("-messages -pickupOtpCode -dropOtpCode")
        .populate("vehicle", "name image category registrationNumber brand model")
        .populate("user", "name email phone image")
        .populate("partner", "name email phone image partnerProfile.businessName");

    if (as === "partner") {
      if (user.role !== "partner" && user.role !== "admin") {
        return jsonError("Partner access only.", 403);
      }

      const ownFilter = applyCommonFilters({ partner: user._id });
      const [own, categories] = await Promise.all([
        populate(Booking.find(ownFilter)).sort({ createdAt: -1 }).lean(),
        Vehicle.distinct("category", {
          owner: user._id,
          approved: true,
          available: true,
        }) as Promise<VehicleCategory[]>,
      ]);

      let broadcasts: Array<Record<string, unknown>> = [];

      const wantsPending = statuses.length === 0 || statuses.includes("pending");
      const profile = user.partnerProfile as unknown as {
        currentLocation?: { lat?: number; lng?: number; updatedAt?: Date; isOnline?: boolean };
        preferences?: { acceptRadiusKm?: number; maxDestinationKm?: number };
      };

      if (wantsPending && categories.length && partnerAvailableFor(profile)) {
        const openFilter: Record<string, unknown> = {
          partner: null,
          status: "pending",
          category: { $in: categories },
          "declines.partner": { $ne: user._id },
        };
        if (searchOr.length) openFilter.$and = [{ $or: searchOr }];

        const open = await populate(Booking.find(openFilter))
          .sort({ createdAt: -1 })
          .limit(100)
          .lean();

        broadcasts = open.filter((booking) =>
          partnerAvailableFor(profile, booking.pickup, booking.drop),
        ) as unknown as Array<Record<string, unknown>>;
      }

      const merged = [...own, ...broadcasts].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      const total = merged.length;

      return NextResponse.json({
        ok: true,
        bookings: merged.slice(skip, skip + limit),
        pagination: {
          page,
          limit,
          total,
          pages: Math.max(1, Math.ceil(total / limit)),
        },
      });
    }

    const filter: Record<string, unknown> = {};
    if (as === "admin") {
      if (user.role !== "admin") return jsonError("Admin access only.", 403);
    } else {
      filter.user = user._id;
    }
    applyCommonFilters(filter);

    const [bookings, total] = await Promise.all([
      populate(Booking.find(filter)).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
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
    const isScheduled =
      data.scheduled === true || (Boolean(data.vehicleId) && data.scheduled === undefined);

    let date = data.date || "";
    let time = data.time || "";
    if (isScheduled) {
      if (!date || !time) return jsonError("Choose a date and time for your scheduled ride.", 422);
      if (!isFutureRide(date, time)) {
        return jsonError("Choose a pickup date and time at least 5 minutes in the future.", 422);
      }
    } else {
      const now = nowRideDateTime();
      date = now.date;
      time = now.time;
    }

    await connectDB();
    const appUrl = process.env.AUTH_URL || "http://localhost:3000";
    const pickupOtp = generateOtp(4);

    if (data.vehicleId) {
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

      const booking = await Booking.create({
        user: user._id,
        partner: owner._id,
        vehicle: vehicle._id,
        category: vehicle.category,
        pickup: data.pickup,
        drop: data.drop,
        scheduled: isScheduled,
        date,
        time,
        distanceKm: route.distanceKm,
        durationMin: route.durationMin,
        fare,
        paymentMethod: data.paymentMethod,
        paymentStatus: "pending",
        status: "pending",
        pickupOtpHash: hashOtp(pickupOtp),
        pickupOtpCode: pickupOtp,
        notes: data.notes || "",
        notifiedPartners: [owner._id],
      });

      await sendBookingStatusEmail(
        user.email,
        user.name,
        "Booking request sent",
        `Your request for ${vehicle.name} is with the partner. We'll notify you as soon as it's accepted.`,
        { label: "View booking", url: `${appUrl}/bookings/${booking._id}` },
      ).catch(console.warn);
      await sendBookingStatusEmail(
        owner.email,
        owner.name,
        "New ride request",
        `${user.name} wants to book your ${vehicle.name}. Review the request in your partner dashboard.`,
        { label: "View request", url: `${appUrl}/dashboard/partner/requests` },
      ).catch(console.warn);

      emitSocketEvent(userRoom(String(owner._id)), "booking:new", {
        bookingId: String(booking._id),
        vehicle: vehicle.name,
        total: fare.total,
        pickup: data.pickup.address,
        drop: data.drop.address,
      });

      // Online bookings are broadcast only after the payment is confirmed, so
      // partners never see a request they aren't allowed to accept yet.
      if (data.paymentMethod === "cash") {
        emitSocketEvent(userRoom(String(owner._id)), "ride:request", {
          bookingId: String(booking._id),
          category: vehicle.category,
          categoryLabel: CATEGORY_MAP[vehicle.category as VehicleCategory]?.label,
          image: vehicle.image,
          vehicle: {
            name: vehicle.name,
            category: vehicle.category,
            image: vehicle.image,
            registrationNumber: vehicle.registrationNumber,
          },
          rider: {
            name: user.name,
            phone: user.phone,
            rating: 5,
          },
          pickup: data.pickup,
          drop: data.drop,
          distanceKm: route.distanceKm,
          durationMin: route.durationMin,
          fare: fare.total,
          partnerEarning: fare.partnerEarning,
          paymentMethod: data.paymentMethod,
          paymentStatus: booking.paymentStatus,
          scheduled: isScheduled,
          date,
          time,
          requestedAt: new Date().toISOString(),
        });
      }

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
            scheduled: isScheduled,
            date,
            time,
          },
          pickupOtp,
        },
        { status: 201 },
      );
    }

    const category = data.category;
    if (!category) return jsonError("Choose a ride type to continue.", 422);

    const eligible = await findEligibleVehicles({
      lat: data.pickup.lat,
      lng: data.pickup.lng,
      category,
      dropLat: data.drop.lat,
      dropLng: data.drop.lng,
    });
    const candidates = eligible.filter((item) => String(item.owner._id) !== String(user._id));
    if (!candidates.length) {
      return jsonError("No online partners are available near this pickup right now.", 409);
    }

    const route = await getRoadRoute(data.pickup, data.drop);
    let fare = calculateFare({
      distanceKm: route.distanceKm,
      durationMin: route.durationMin,
      baseFare: candidates[0].vehicle.baseFare,
      pricePerKm: candidates[0].vehicle.pricePerKm,
      pricePerHour: candidates[0].vehicle.pricePerHour,
      minimumFare: candidates[0].vehicle.minimumFare,
    });
    let representative = candidates[0];
    for (const candidate of candidates.slice(1)) {
      const candidateFare = calculateFare({
        distanceKm: route.distanceKm,
        durationMin: route.durationMin,
        baseFare: candidate.vehicle.baseFare,
        pricePerKm: candidate.vehicle.pricePerKm,
        pricePerHour: candidate.vehicle.pricePerHour,
        minimumFare: candidate.vehicle.minimumFare,
      });
      if (candidateFare.total < fare.total) {
        fare = candidateFare;
        representative = candidate;
      }
    }

    const partners = new Map<string, (typeof candidates)[number]>();
    for (const candidate of candidates) {
      const id = String(candidate.owner._id);
      if (!partners.has(id)) partners.set(id, candidate);
    }

    const booking = await Booking.create({
      user: user._id,
      partner: null,
      vehicle: null,
      category,
      pickup: data.pickup,
      drop: data.drop,
      scheduled: isScheduled,
      date,
      time,
      distanceKm: route.distanceKm,
      durationMin: route.durationMin,
      fare,
      paymentMethod: data.paymentMethod,
      paymentStatus: "pending",
      status: "pending",
      pickupOtpHash: hashOtp(pickupOtp),
      pickupOtpCode: pickupOtp,
      notes: data.notes || "",
      notifiedPartners: [...partners.keys()].map(
        (id) => new mongoose.Types.ObjectId(id),
      ),
    });

    const label = CATEGORY_MAP[category]?.label || "Ride";
    const payload = {
      bookingId: String(booking._id),
      category,
      categoryLabel: label,
      image: representative.vehicle.image,
      rider: {
        name: user.name,
        phone: user.phone,
        rating: 5,
      },
      pickup: data.pickup,
      drop: data.drop,
      distanceKm: route.distanceKm,
      durationMin: route.durationMin,
      fare: fare.total,
      partnerEarning: fare.partnerEarning,
      paymentMethod: data.paymentMethod,
      paymentStatus: booking.paymentStatus,
      scheduled: isScheduled,
      date,
      time,
      requestedAt: new Date().toISOString(),
    };

    for (const [partnerId] of partners) {
      emitSocketEvent(userRoom(partnerId), "booking:new", {
        bookingId: String(booking._id),
        vehicle: `${label} request`,
        total: fare.total,
        pickup: data.pickup.address,
        drop: data.drop.address,
      });
      // Online bookings are broadcast only after the payment is confirmed.
      if (data.paymentMethod === "cash") {
        emitSocketEvent(userRoom(partnerId), "ride:request", payload);
      }
    }

    await sendBookingStatusEmail(
      user.email,
      user.name,
      data.paymentMethod === "online" ? "Complete your payment" : "Your ride request is live",
      data.paymentMethod === "online"
        ? `Pay for your ${label} ride on the next screen. We'll notify nearby partners as soon as the payment is confirmed.`
        : `${label} partners near your pickup are being notified. The first one to accept will be assigned to you.`,
      { label: "Track request", url: `${appUrl}/bookings/${booking._id}` },
    ).catch(console.warn);

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
          category,
          fare,
          distanceKm: route.distanceKm,
          durationMin: route.durationMin,
          paymentMethod: data.paymentMethod,
          routeProvider: route.provider,
          scheduled: isScheduled,
          date,
          time,
        },
        pickupOtp,
      },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
