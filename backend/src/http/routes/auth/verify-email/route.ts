import { NextResponse } from "next/server";
import { connectDB } from "@rydex/backend/lib/db";
import { User } from "@rydex/backend/models/user.model";
import { verifyEmailSchema } from "@rydex/shared/validation";
import { verifyOtp } from "@rydex/backend/lib/otp";
import { handleApiError, jsonError } from "@rydex/backend/lib/auth-helpers";
import { clientIp, rateLimit } from "@rydex/backend/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const limit = rateLimit(`verify:${clientIp(request)}`, 12, 60_000);
    if (!limit.allowed) return jsonError("Too many attempts. Please wait a minute.", 429);

    const body = await request.json();
    const parsed = verifyEmailSchema.safeParse(body);
    if (!parsed.success) return jsonError(parsed.error.issues[0]?.message || "Invalid code.", 422);

    await connectDB();
    const user = await User.findOne({ email: parsed.data.email }).select(
      "+emailOtpHash +emailOtpExpires",
    );
    if (!user) return jsonError("Account not found. Create an account first.", 404);
    if (user.emailVerified) {
      return NextResponse.json({ ok: true, alreadyVerified: true });
    }
    if (!user.emailOtpExpires || user.emailOtpExpires.getTime() < Date.now()) {
      return jsonError("This code has expired. Request a new one.", 410);
    }
    if (!verifyOtp(parsed.data.otp, user.emailOtpHash)) {
      return jsonError("That code is incorrect. Check and try again.", 422);
    }

    user.emailVerified = new Date();
    user.emailOtpHash = undefined;
    user.emailOtpExpires = undefined;
    await user.save();

    return NextResponse.json({ ok: true, verified: true });
  } catch (error) {
    return handleApiError(error);
  }
}
