import Razorpay from "razorpay";
import { createHmac } from "crypto";

export function razorpayConfigured() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

export function getRazorpay() {
  if (!razorpayConfigured()) {
    throw new Error("Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.");
  }
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  });
}

export function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string) {
  const expected = createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return expected === signature;
}

export async function refundPayment(paymentId?: string, amountInRupees?: number) {
  if (!razorpayConfigured() || !paymentId) return null;
  const razorpay = getRazorpay();
  const refund = await razorpay.payments.refund(paymentId, {
    ...(amountInRupees ? { amount: Math.round(amountInRupees * 100) } : {}),
    speed: "normal",
    notes: { source: "rydex" },
  });
  return refund;
}
