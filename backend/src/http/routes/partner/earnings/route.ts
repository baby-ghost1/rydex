import { NextResponse } from "next/server";
import { connectDB } from "@rydex/backend/lib/db";
import { Booking } from "@rydex/backend/models/booking.model";
import { handleApiError, jsonError, requireUser } from "@rydex/backend/lib/auth-helpers";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    if (user.role !== "partner" && user.role !== "admin") {
      return jsonError("Partner access only.", 403);
    }
    await connectDB();
    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "month";
    const now = new Date();
    let from = new Date(now.getFullYear(), now.getMonth(), 1);
    if (range === "week") from = new Date(now.getTime() - 6 * 86400000);
    if (range === "year") from = new Date(now.getFullYear(), 0, 1);
    if (range === "all") from = new Date(0);

    const match = {
      partner: user._id,
      status: "completed" as const,
      completedAt: { $gte: from },
    };

    const [summary, bookings, monthly, paymentSplit] = await Promise.all([
      Booking.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            gross: { $sum: "$fare.total" },
            net: { $sum: "$fare.partnerEarning" },
            platform: { $sum: "$fare.platformFee" },
            trips: { $sum: 1 },
            distance: { $sum: "$distanceKm" },
            avgRating: { $avg: "$rating" },
          },
        },
      ]),
      Booking.find(match)
        .sort({ completedAt: -1 })
        .limit(40)
        .populate("vehicle", "name image category")
        .populate("user", "name")
        .lean(),
      Booking.aggregate([
        { $match: { partner: user._id, status: "completed" } },
        {
          $group: {
            _id: { y: { $year: "$completedAt" }, m: { $month: "$completedAt" } },
            net: { $sum: "$fare.partnerEarning" },
            gross: { $sum: "$fare.total" },
            trips: { $sum: 1 },
          },
        },
        { $sort: { "_id.y": -1, "_id.m": -1 } },
        { $limit: 12 },
      ]),
      Booking.aggregate([
        { $match: { partner: user._id, status: "completed" } },
        {
          $group: {
            _id: "$paymentMethod",
            total: { $sum: "$fare.partnerEarning" },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const totals = summary[0] || {
      gross: 0,
      net: 0,
      platform: 0,
      trips: 0,
      distance: 0,
      avgRating: 0,
    };

    return NextResponse.json({
      ok: true,
      range,
      summary: {
        ...totals,
        avgPerTrip: totals.trips ? Math.round(totals.net / totals.trips) : 0,
        avgRating: totals.avgRating ? Math.round(totals.avgRating * 10) / 10 : 0,
      },
      monthly,
      paymentSplit,
      bookings,
      bank: {
        accountHolder: user.partnerProfile?.bank?.accountHolder || "",
        bankName: user.partnerProfile?.bank?.bankName || "",
        accountNumberLast4: user.partnerProfile?.bank?.accountNumberLast4 || "",
        ifsc: user.partnerProfile?.bank?.ifsc || "",
        upiId: user.partnerProfile?.bank?.upiId || "",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
