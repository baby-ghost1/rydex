import { NextResponse } from "next/server";
import { connectDB } from "@rydex/backend/lib/db";
import { User } from "@rydex/backend/models/user.model";
import { handleApiError, parsePagination, requireRole } from "@rydex/backend/lib/auth-helpers";

export async function GET(request: Request) {
  try {
    await requireRole(["admin"]);
    await connectDB();
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(request.url, 10);
    const status = searchParams.get("status");
    const q = searchParams.get("q")?.trim();

    const filter: Record<string, unknown> = {
      $or: [{ role: "partner" }, { partnerStatus: { $ne: "none" } }],
    };
    if (status && ["draft", "pending", "approved", "rejected"].includes(status)) {
      filter.partnerStatus = status;
    }
    if (q) {
      const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$and = [
        { $or: [{ role: "partner" }, { partnerStatus: { $ne: "none" } }] },
        {
          $or: [
            { name: { $regex: safe, $options: "i" } },
            { email: { $regex: safe, $options: "i" } },
            { "partnerProfile.businessName": { $regex: safe, $options: "i" } },
          ],
        },
      ];
      delete filter.$or;
    }

    const [vendors, total] = await Promise.all([
      User.find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .select(
          "name email phone image role partnerStatus partnerProfile.businessName partnerProfile.ownerName partnerProfile.vehicleDraft partnerProfile.kyc.status partnerProfile.submittedAt partnerProfile.rejectionReason createdAt updatedAt",
        )
        .lean(),
      User.countDocuments(filter),
    ]);

    return NextResponse.json({
      ok: true,
      vendors,
      pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
