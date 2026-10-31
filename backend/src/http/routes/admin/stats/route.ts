import { NextResponse } from "next/server";
import { connectDB } from "@rydex/backend/lib/db";
import { User } from "@rydex/backend/models/user.model";
import { Booking } from "@rydex/backend/models/booking.model";
import { Vehicle } from "@rydex/backend/models/vehicle.model";
import { handleApiError, requireRole } from "@rydex/backend/lib/auth-helpers";

export async function GET() {
  try {
    await requireRole(["admin"]);
    await connectDB();

    const [vendors, totals, bookingStats, revenue, monthlyVendors, recent] = await Promise.all([
      User.aggregate([
        { $match: { $or: [{ role: "partner" }, { partnerStatus: { $ne: "none" } }] } },
        { $group: { _id: "$partnerStatus", count: { $sum: 1 } } },
      ]),
      User.countDocuments({}),
      Booking.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Booking.aggregate([
        { $match: { status: "completed" } },
        {
          $group: {
            _id: null,
            gross: { $sum: "$fare.total" },
            platform: { $sum: "$fare.platformFee" },
            partner: { $sum: "$fare.partnerEarning" },
            trips: { $sum: 1 },
          },
        },
      ]),
      User.aggregate([
        {
          $match: {
            $or: [{ role: "partner" }, { partnerStatus: { $ne: "none" } }],
          },
        },
        {
          $group: {
            _id: { y: { $year: "$createdAt" }, m: { $month: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.y": 1, "_id.m": 1 } },
        { $limit: 6 },
      ]),
      User.find({ $or: [{ role: "partner" }, { partnerStatus: { $ne: "none" } }] })
        .sort({ updatedAt: -1 })
        .limit(6)
        .select("name email image partnerStatus partnerProfile.businessName partnerProfile.vehicleDraft createdAt")
        .lean(),
    ]);

    const vendorsByStatus: Record<string, number> = {};
    for (const row of vendors) vendorsByStatus[row._id] = row.count;
    const bookingByStatus: Record<string, number> = {};
    for (const row of bookingStats) bookingByStatus[row._id] = row.count;
    const money = revenue[0] || { gross: 0, platform: 0, partner: 0, trips: 0 };

    const approved = vendorsByStatus.approved || 0;
    const pending = vendorsByStatus.pending || 0;
    const rejected = vendorsByStatus.rejected || 0;
    const drafts = vendorsByStatus.draft || 0;
    const totalVendors = approved + pending + rejected + drafts;
    const activeVehicles = await Vehicle.countDocuments({ approved: true, available: true });

    return NextResponse.json({
      ok: true,
      stats: {
        totalVendors,
        approved,
        pending,
        rejected,
        drafts,
        users: totals,
        activeVehicles,
        bookings: Object.values(bookingByStatus).reduce((a, b) => a + b, 0),
        completedTrips: bookingByStatus.completed || 0,
        grossRevenue: money.gross,
        platformRevenue: money.platform,
        partnerPayouts: money.partner,
      },
      bookingByStatus,
      recent,
      monthlyVendors,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
