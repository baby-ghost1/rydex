/**
 * Development-only helper for surfacing OTPs when no mail provider is set up.
 * Production must never return an OTP to the client, even if email delivery is
 * misconfigured.
 */
export function devOtpField(otp: string) {
  if (process.env.NODE_ENV === "production") return {};
  return { devOtp: otp };
}
