import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@rydex/backend/lib/db";
import { User } from "@rydex/backend/models/user.model";
import { registerSchema } from "@rydex/shared/validation";
import { generateOtp, hashOtp, otpExpiry } from "@rydex/backend/lib/otp";
import { sendOtpEmail } from "@rydex/backend/lib/email";
import { handleApiError, jsonError } from "@rydex/backend/lib/auth-helpers";
import { clientIp, rateLimit } from "@rydex/backend/lib/rate-limit";
import { devOtpField } from "@rydex/backend/lib/dev-otp";

export async function POST(request: Request) {
  try {
    const ip = clientIp(request);
    const limit = rateLimit(`register:${ip}`, 6, 60_000);
    if (!limit.allowed) {
      return jsonError(`Too many attempts. Try again in ${limit.retryAfter}s.`, 429);
    }

    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message || "Check your details.", 422);
    }
    const { name, email, password, phone } = parsed.data;

    await connectDB();
    const existing = await User.findOne({ email });
    if (existing?.emailVerified) {
      return jsonError("An account with this email already exists. Sign in instead.", 409);
    }

    const otp = generateOtp(6);
    const passwordHash = await bcrypt.hash(password, 12);
    const otpFields = {
      name,
      phone,
      passwordHash,
      emailOtpHash: hashOtp(otp),
      emailOtpExpires: otpExpiry(10),
    };

    if (existing) {
      await User.updateOne({ _id: existing._id }, { $set: otpFields });
    } else {
      await User.create({
        name,
        email,
        phone,
        passwordHash,
        emailOtpHash: hashOtp(otp),
        emailOtpExpires: otpExpiry(10),
        role: "user",
        partnerStatus: "none",
        emailVerified: null,
      });
    }

    await sendOtpEmail(email, name, otp);

    return NextResponse.json({
      ok: true,
      email,
      ...devOtpField(otp),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
