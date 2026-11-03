import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@rydex/backend/lib/db";
import { User } from "@rydex/backend/models/user.model";
import { requireUser, handleApiError, jsonError } from "@rydex/backend/lib/auth-helpers";

const schema = z.object({
  acceptRadiusKm: z.coerce.number().int().min(1).max(100).optional(),
});

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    if (user.role !== "partner" && user.role !== "admin") {
      return jsonError("Partner access only.", 403);
    }
    if (user.partnerStatus !== "approved" && user.role !== "admin") {
      return jsonError("Your partner account must be approved first.", 403);
    }

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return jsonError("Invalid preferences.", 422);

    await connectDB();
    const { acceptRadiusKm } = parsed.data;

    const update: Record<string, unknown> = {};
    if (typeof acceptRadiusKm === "number") update["partnerProfile.preferences.acceptRadiusKm"] = acceptRadiusKm;

    if (Object.keys(update).length === 0) return jsonError("No valid preferences provided.", 422);

    await User.updateOne({ _id: user._id }, { $set: update });

    return NextResponse.json({ ok: true, preferences: { acceptRadiusKm } });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET() {
  try {
    const user = await requireUser();
    if (user.role !== "partner" && user.role !== "admin") {
      return jsonError("Partner access only.", 403);
    }

    return NextResponse.json({
      ok: true,
      preferences: {
        acceptRadiusKm: user.partnerProfile?.preferences?.acceptRadiusKm || 10,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
