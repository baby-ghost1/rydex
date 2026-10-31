import { NextResponse } from "next/server";
import { connectDB } from "@rydex/backend/lib/db";
import { Booking } from "@rydex/backend/models/booking.model";
import { Vehicle } from "@rydex/backend/models/vehicle.model";
import { handleApiError, requireUser } from "@rydex/backend/lib/auth-helpers";

export async function GET() {
  try {
    const user = await requireUser();
    await connectDB();
    const partnerId = user._id;

    const [statusCounts, earnings, recent, vehicles, ratingAgg] = await Promise.all([
      Booking.aggregate([
        { $match: { partner: partnerId } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Booking.aggregate([
        { $match: { partner: partnerId, status: "completed" } },
        {
          $group: {
            _id: null,
            gross: { $sum: "$fare.total" },
            net: { $sum: "$fare.partnerEarning" },
            platform: { $sum: "$fare.platformFee" },
            trips: { $sum: 1 },
          },
        },
      ]),
      Booking.find({ partner: partnerId })
        .sort({ updatedAt: -1 })
        .limit(6)
        .populate("vehicle", "name image category registrationNumber")
        .populate("user", "name image phone")
        .lean(),
      Vehicle.countDocuments({ owner: partnerId }),
      Booking.aggregate([
        { $match: { partner: partnerId, status: "completed", rating: { $exists: true } } },
        { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
      ]),
    ]);

    const counts: Record<string, number> = {};
    for (const row of statusCounts) counts[row._id] = row.count;
    const totals = earnings[0] || { gross: 0, net: 0, platform: 0, trips: 0 };

    // Six-month earnings trend.
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);
    const monthlyRaw = await Booking.aggregate([
      {
        $match: {
          partner: partnerId,
          status: "completed",
          completedAt: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: { y: { $year: "$completedAt" }, m: { $month: "$completedAt" } },
          net: { $sum: "$fare.partnerEarning" },
          trips: { $sum: 1 },
        },
      },
      { $sort: { "_id.y": 1, "_id.m": 1 } },
    ]);

    const months: Array<{ key: string; label: string; net: number; trips: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      const found = monthlyRaw.find(
        (row) => row._id.y === d.getFullYear() && row._id.m === d.getMonth() + 1,
      );
      months.push({
        key,
        label: d.toLocaleString("en-IN", { month: "short" }),
        net: found?.net || 0,
        trips: found?.trips || 0,
      });
    }

    return NextResponse.json({
      ok: true,
      stats: {
        pending: counts.pending || 0,
        accepted: counts.accepted || 0,
        arrived: counts.arrived || 0,
        started: counts.started || 0,
        completed: counts.completed || 0,
        rejected: counts.rejected || 0,
        cancelled: counts.cancelled || 0,
        active: (counts.accepted || 0) + (counts.arrived || 0) + (counts.started || 0),
        gross: totals.gross,
        net: totals.net,
        platform: totals.platform,
        trips: totals.trips,
        vehicles,
        rating: ratingAgg[0]?.avg ? Math.round(ratingAgg[0].avg * 10) / 10 : 0,
        ratingCount: ratingAgg[0]?.count || 0,
      },
      months,
      recent,
      partnerStatus: user.partnerStatus,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
