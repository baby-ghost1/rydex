import { NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError, jsonError, requireUser } from "@rydex/backend/lib/auth-helpers";
import { connectDB } from "@rydex/backend/lib/db";

const schema = z.object({ role: z.enum(["user", "partner"]) });

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return jsonError("Choose either rider or partner mode.", 422);
    if (user.role === "admin") return jsonError("Admin accounts cannot switch modes.", 403);

    await connectDB();
    user.role = parsed.data.role;
    if (parsed.data.role === "partner" && user.partnerStatus === "none") {
      user.partnerStatus = "draft";
    }
    await user.save();

    return NextResponse.json({
      ok: true,
      role: user.role,
      partnerStatus: user.partnerStatus,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
