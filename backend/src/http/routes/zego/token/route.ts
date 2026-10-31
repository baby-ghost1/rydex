import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { handleApiError, jsonError, requireUser } from "@rydex/backend/lib/auth-helpers";
import { connectDB } from "@rydex/backend/lib/db";
import { User } from "@rydex/backend/models/user.model";
import { generateZegoToken, kycRoomId, zegoConfigured } from "@rydex/backend/lib/zego";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    if (!zegoConfigured()) {
      return jsonError(
        "Live video KYC isn't configured. Record and upload a verification video instead.",
        503,
      );
    }
    const { searchParams } = new URL(request.url);
    const vendorId = searchParams.get("vendorId");
    let targetUserId = String(user._id);

    if (vendorId && user.role === "admin") {
      if (!mongoose.isValidObjectId(vendorId)) return jsonError("Vendor not found.", 404);
      await connectDB();
      const vendor = await User.findById(vendorId).select("role").lean();
      if (!vendor) return jsonError("Vendor not found.", 404);
      targetUserId = vendorId;
    } else if (user.role !== "partner" && user.role !== "admin") {
      return jsonError("Video KYC is available to partners only.", 403);
    }

    const appId = Number(process.env.NEXT_PUBLIC_ZEGO_APP_ID);
    if (!Number.isFinite(appId) || appId <= 0) {
      return jsonError("ZEGOCLOUD app ID is invalid.", 503);
    }
    const roomId = kycRoomId(targetUserId);
    const token = generateZegoToken(
      appId,
      String(user._id),
      process.env.ZEGO_SERVER_SECRET!,
      60 * 60,
    );

    return NextResponse.json({
      ok: true,
      appId,
      token,
      roomId,
      userId: String(user._id),
      role: user.role,
      targetUserId,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
