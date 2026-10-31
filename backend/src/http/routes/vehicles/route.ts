import { NextResponse } from "next/server";
import { connectDB } from "@rydex/backend/lib/db";
import { Vehicle } from "@rydex/backend/models/vehicle.model";
import { requireUser, handleApiError, jsonError, parsePagination } from "@rydex/backend/lib/auth-helpers";
import { vehicleSchema } from "@rydex/shared/validation";
import { clientIp, rateLimit } from "@rydex/backend/lib/rate-limit";

export async function GET(request: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(request.url, 12);
    const category = searchParams.get("category");
    const q = searchParams.get("q")?.trim();
    const minPrice = Number(searchParams.get("minPrice") || 0);
    const maxPrice = Number(searchParams.get("maxPrice") || 0);
    const seats = Number(searchParams.get("seats") || 0);
    const sort = searchParams.get("sort") || "newest";
    const mine = searchParams.get("mine") === "1";
    const all = searchParams.get("all") === "1";

    const filter: Record<string, unknown> = {};
    if (mine) {
      const user = await requireUser();
      if (user.role === "admin" && all) {
        // admins can inspect every listing
      } else {
        filter.owner = user._id;
      }
    } else {
      filter.approved = true;
      filter.available = true;
    }
    if (category && ["bike", "car", "auto", "loading", "truck"].includes(category)) {
      filter.category = category;
    }
    if (q) {
      const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { name: { $regex: safe, $options: "i" } },
        { brand: { $regex: safe, $options: "i" } },
        { model: { $regex: safe, $options: "i" } },
      ];
    }
    if (minPrice > 0 || maxPrice > 0) {
      filter.pricePerKm = {
        ...(minPrice > 0 ? { $gte: minPrice } : {}),
        ...(maxPrice > 0 ? { $lte: maxPrice } : {}),
      };
    }
    if (seats > 0) filter.seats = { $gte: seats };

    const sortMap: Record<string, Record<string, 1 | -1>> = {
      newest: { createdAt: -1 },
      price_asc: { pricePerKm: 1 },
      price_desc: { pricePerKm: -1 },
      rating: { rating: -1, totalTrips: -1 },
    };

    const [vehicles, total] = await Promise.all([
      Vehicle.find(filter)
        .populate("owner", "name image partnerProfile.businessName")
        .sort(sortMap[sort] || sortMap.newest)
        .skip(skip)
        .limit(limit)
        .lean(),
      Vehicle.countDocuments(filter),
    ]);

    return NextResponse.json({
      ok: true,
      vehicles,
      pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    if (user.role !== "partner" && user.role !== "admin") {
      return jsonError("Switch to partner mode before adding a vehicle.", 403);
    }
    if (user.role === "partner" && user.partnerStatus !== "approved") {
      return jsonError("Your partner application must be approved first.", 403);
    }
    const limit = rateLimit(`vehicle-add:${clientIp(request)}`, 10, 60_000);
    if (!limit.allowed) return jsonError("Too many requests. Try again shortly.", 429);

    const body = await request.json();
    const parsed = vehicleSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message || "Check the vehicle details.", 422);
    }
    await connectDB();
    const vehicle = await Vehicle.create({
      ...parsed.data,
      owner: user._id,
      approved: user.role === "admin" ? true : user.partnerStatus === "approved",
      available: parsed.data.available ?? true,
    });
    return NextResponse.json({ ok: true, vehicle }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
