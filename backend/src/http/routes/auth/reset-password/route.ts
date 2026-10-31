import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { connectDB } from "@rydex/backend/lib/db";
import { User } from "@rydex/backend/models/user.model";
import { verifyOtp } from "@rydex/backend/lib/otp";
import { handleApiError, jsonError } from "@rydex/backend/lib/auth-helpers";
import { clientIp, rateLimit } from "@rydex/backend/lib/rate-limit";

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  otp: z.string().trim().length(6),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Za-z]/, "Include at least one letter")
    .regex(/\d/, "Include at least one number"),
});

export async function POST(request: Request) {
  try {
    const limit = rateLimit(`reset:${clientIp(request)}`, 10, 60_000);
    if (!limit.allowed) return jsonError("Too many attempts. Please wait a minute.", 429);

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return jsonError(parsed.error.issues[0]?.message || "Check your details.", 422);

    await connectDB();
    const user = await User.findOne({ email: parsed.data.email }).select(
      "+resetOtpHash +resetOtpExpires",
    );
    if (!user) return jsonError("That reset code is invalid or expired.", 422);
    if (!user.resetOtpExpires || user.resetOtpExpires.getTime() < Date.now()) {
      return jsonError("That reset code has expired. Request a new one.", 410);
    }
    if (!verifyOtp(parsed.data.otp, user.resetOtpHash)) {
      return jsonError("That reset code is incorrect.", 422);
    }

    user.passwordHash = await bcrypt.hash(parsed.data.password, 12);
    user.resetOtpHash = undefined;
    user.resetOtpExpires = undefined;
    if (!user.emailVerified) user.emailVerified = new Date();
    await user.save();

    return NextResponse.json({ ok: true, reset: true });
  } catch (error) {
    return handleApiError(error);
  }
}
