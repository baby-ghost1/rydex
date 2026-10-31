import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@rydex/backend/lib/db";
import { User } from "@rydex/backend/models/user.model";
import { generateOtp, hashOtp, otpExpiry } from "@rydex/backend/lib/otp";
import { sendOtpEmail } from "@rydex/backend/lib/email";
import { handleApiError, jsonError } from "@rydex/backend/lib/auth-helpers";
import { clientIp, rateLimit } from "@rydex/backend/lib/rate-limit";
import { devOtpField } from "@rydex/backend/lib/dev-otp";

const schema = z.object({ email: z.string().trim().toLowerCase().email() });

export async function POST(request: Request) {
  try {
    const limit = rateLimit(`resend:${clientIp(request)}`, 6, 60_000);
    if (!limit.allowed) return jsonError("Too many requests. Please wait a minute.", 429);

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return jsonError("Enter a valid email address.", 422);

    await connectDB();
    const user = await User.findOne({ email: parsed.data.email });

    // Always return 200 to avoid account enumeration. Only actually resend for
    // unverified accounts.
    if (!user || user.emailVerified) {
      return NextResponse.json({ ok: true, email: parsed.data.email });
    }

    const otp = generateOtp(6);
    user.emailOtpHash = hashOtp(otp);
    user.emailOtpExpires = otpExpiry(10);
    await user.save();
    await sendOtpEmail(user.email, user.name, otp);

    return NextResponse.json({
      ok: true,
      email: user.email,
      ...devOtpField(otp),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
