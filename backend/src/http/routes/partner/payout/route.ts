import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@rydex/backend/lib/db";
import { handleApiError, jsonError, requireRole } from "@rydex/backend/lib/auth-helpers";
import { encryptSensitive } from "@rydex/backend/lib/crypto";

const payoutSchema = z
  .object({
    accountHolder: z.string().trim().min(2).max(80),
    accountNumber: z.string().trim().regex(/^\d{9,18}$/, "Enter a valid account number"),
    confirmAccountNumber: z.string().trim(),
    ifsc: z.string().trim().toUpperCase().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Enter a valid IFSC code"),
    bankName: z.string().trim().min(2).max(80),
    upiId: z.string().trim().max(80).optional().or(z.literal("")),
  })
  .refine((data) => data.accountNumber === data.confirmAccountNumber, {
    message: "Account numbers do not match.",
    path: ["confirmAccountNumber"],
  });

export async function PATCH(request: Request) {
  try {
    const user = await requireRole(["partner"]);
    const parsed = payoutSchema.safeParse(await request.json());
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message || "Check your payout details.", 422);
    }
    const data = parsed.data;

    await connectDB();
    user.partnerProfile.bank = {
      accountHolder: data.accountHolder,
      accountNumber: encryptSensitive(data.accountNumber),
      accountNumberLast4: data.accountNumber.slice(-4),
      ifsc: data.ifsc,
      bankName: data.bankName,
      upiId: data.upiId || "",
    };
    user.markModified("partnerProfile");
    await user.save();

    return NextResponse.json({
      ok: true,
      bank: {
        accountHolder: data.accountHolder,
        bankName: data.bankName,
        accountNumberLast4: data.accountNumber.slice(-4),
        ifsc: data.ifsc,
        upiId: data.upiId || "",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
