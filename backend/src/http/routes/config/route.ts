import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    appUrl: process.env.AUTH_URL || "",
    googleEnabled: Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET),
    razorpayEnabled: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
    zegoEnabled: Boolean(process.env.NEXT_PUBLIC_ZEGO_APP_ID && process.env.ZEGO_SERVER_SECRET),
    emailEnabled: Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS),
    cloudinaryEnabled: Boolean(
      process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET,
    ),
    demoMode: process.env.NODE_ENV !== "production",
  });
}
