import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@rydex/backend/lib/db";
import { User } from "@rydex/backend/models/user.model";
import { Vehicle } from "@rydex/backend/models/vehicle.model";
import { Booking } from "@rydex/backend/models/booking.model";
import { handleApiError, jsonError, requireRole } from "@rydex/backend/lib/auth-helpers";
import { z } from "zod";
import { sendBookingStatusEmail } from "@rydex/backend/lib/email";
import { emitSocketEvent, userRoom } from "@rydex/backend/lib/socket";

async function getVendor(id: string) {
  await connectDB();
  if (!mongoose.isValidObjectId(id)) return null;
  return User.findOne({ _id: id, $or: [{ role: "partner" }, { partnerStatus: { $ne: "none" } }] });
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(["admin"]);
    const { id } = await params;
    const vendor = await getVendor(id);
    if (!vendor) return jsonError("Vendor not found.", 404);
    const [vehicles, bookings, completed] = await Promise.all([
      Vehicle.find({ owner: vendor._id }).lean(),
      Booking.countDocuments({ partner: vendor._id }),
      Booking.aggregate([
        { $match: { partner: vendor._id, status: "completed" } },
        {
          $group: {
            _id: null,
            net: { $sum: "$fare.partnerEarning" },
            trips: { $sum: 1 },
          },
        },
      ]),
    ]);
    const profile = vendor.partnerProfile || {};
    return NextResponse.json({
      ok: true,
      vendor: {
        id: String(vendor._id),
        name: vendor.name,
        email: vendor.email,
        phone: vendor.phone,
        image: vendor.image,
        role: vendor.role,
        partnerStatus: vendor.partnerStatus,
        createdAt: vendor.createdAt,
        profile: {
          businessName: profile.businessName || "",
          ownerName: profile.ownerName || "",
          vehicleDraft: profile.vehicleDraft || {},
          documents: profile.documents || {},
          bank: {
            accountHolder: profile.bank?.accountHolder || "",
            accountNumberLast4: profile.bank?.accountNumberLast4 || "",
            ifsc: profile.bank?.ifsc || "",
            bankName: profile.bank?.bankName || "",
            upiId: profile.bank?.upiId || "",
          },
          kyc: profile.kyc || {},
          pricing: profile.pricing || {},
          submittedAt: profile.submittedAt,
          reviewedAt: profile.reviewedAt,
          rejectionReason: profile.rejectionReason || "",
        },
      },
      vehicles,
      metrics: {
        bookings,
        trips: completed[0]?.trips || 0,
        netEarnings: completed[0]?.net || 0,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

const actionSchema = z.object({
  action: z.enum(["approve", "reject"]),
  reason: z.string().trim().max(500).optional(),
  resetKyc: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(["admin"]);
    const { id } = await params;
    const parsed = actionSchema.safeParse(await request.json());
    if (!parsed.success) return jsonError("Invalid review action.", 422);
    const vendor = await getVendor(id);
    if (!vendor) return jsonError("Vendor not found.", 404);
    if (!vendor.partnerProfile?.submittedAt) {
      return jsonError("This vendor has not submitted their application yet.", 409);
    }
    if (parsed.data.action === "reject" && !parsed.data.reason) {
      return jsonError("Add a reason so the partner knows what to fix.", 422);
    }

    const approved = parsed.data.action === "approve";
    const appUrl = process.env.AUTH_URL || "http://localhost:3000";

    vendor.partnerStatus = approved ? "approved" : "rejected";
    vendor.role = "partner";
    vendor.partnerProfile.reviewedAt = new Date();
    vendor.partnerProfile.rejectionReason = approved ? "" : parsed.data.reason || "";
    if (vendor.partnerProfile.kyc) {
      if (approved) {
        vendor.partnerProfile.kyc.status = "approved";
        vendor.partnerProfile.kyc.reviewedAt = new Date();
        vendor.partnerProfile.kyc.note = "Verified by RYDEX";
      } else if (parsed.data.resetKyc) {
        // Force a brand-new verification: drop the previous evidence so a stale
        // video cannot be resubmitted, but keep the review note for context.
        vendor.partnerProfile.kyc.status = "rejected";
        vendor.partnerProfile.kyc.reviewedAt = new Date();
        vendor.partnerProfile.kyc.note = parsed.data.reason || "";
        vendor.partnerProfile.kyc.videoUrl = "";
        vendor.partnerProfile.kyc.roomId = "";
        vendor.partnerProfile.kyc.submittedAt = undefined;
      } else {
        vendor.partnerProfile.kyc.note = parsed.data.reason || vendor.partnerProfile.kyc.note;
        vendor.partnerProfile.kyc.reviewedAt = new Date();
      }
    }
    vendor.markModified("partnerProfile");
    await vendor.save();

    await Vehicle.updateMany(
      { owner: vendor._id },
      { $set: { approved } },
    );

    if (approved) {
      await sendBookingStatusEmail(
        vendor.email,
        vendor.name,
        "You're approved 🎉",
        "Your RYDEX partner application has been approved. Your vehicle is now live and riders can start booking.",
        { label: "Open partner dashboard", url: `${appUrl}/dashboard/partner` },
      ).catch(console.warn);
    } else {
      await sendBookingStatusEmail(
        vendor.email,
        vendor.name,
        "Action needed on your application",
        `We couldn't approve your application yet. Reason: ${parsed.data.reason}. Update your details and resubmit.`,
        { label: "Update application", url: `${appUrl}/dashboard/partner/onboarding` },
      ).catch(console.warn);
    }

    emitSocketEvent(userRoom(String(vendor._id)), "partner:reviewed", {
      status: vendor.partnerStatus,
      reason: vendor.partnerProfile.rejectionReason,
    });

    return NextResponse.json({
      ok: true,
      partnerStatus: vendor.partnerStatus,
      approved,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
