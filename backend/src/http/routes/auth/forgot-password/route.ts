import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@rydex/backend/lib/db";
import { User } from "@rydex/backend/models/user.model";
import { generateOtp, hashOtp, otpExpiry } from "@rydex/backend/lib/otp";
import { sendResetOtpEmail } from "@rydex/backend/lib/email";
import { handleApiError, jsonError } from "@rydex/backend/lib/auth-helpers";
import { clientIp, rateLimit } from "@rydex/backend/lib/rate-limit";
import { devOtpField } from "@rydex/backend/lib/dev-otp";

const schema = z.object({ email: z.string().trim().toLowerCase().email() });

export async function POST(request: Request) {
  try {
    const limit = rateLimit(`forgot:${clientIp(request)}`, 5, 60_000);
    if (!limit.allowed) return jsonError("Too many requests. Please wait a minute.", 429);

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return jsonError("Enter a valid email address.", 422);

    await connectDB();
    const user = await User.findOne({ email: parsed.data.email });

    if (user) {
      const otp = generateOtp(6);
      user.resetOtpHash = hashOtp(otp);
      user.resetOtpExpires = otpExpiry(10);
      await user.save();
      await sendResetOtpEmail(user.email, otp);
      return NextResponse.json({
        ok: true,
        ...devOtpField(otp),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
