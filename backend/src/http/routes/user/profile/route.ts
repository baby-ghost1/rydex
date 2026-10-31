import { NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError, jsonError, requireUser } from "@rydex/backend/lib/auth-helpers";
import { connectDB } from "@rydex/backend/lib/db";

const imageSchema = z
  .string()
  .trim()
  .max(1000)
  .refine(
    (value) =>
      value === "" ||
      value.startsWith("/uploads/") ||
      /^https?:\/\//i.test(value),
    "Enter a valid image URL.",
  );

const schema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid mobile number").optional().or(z.literal("")),
  image: imageSchema.optional(),
});

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json({
      ok: true,
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        image: user.image || "",
        role: user.role,
        partnerStatus: user.partnerStatus,
        partnerProfile: user.partnerProfile,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return jsonError(parsed.error.issues[0]?.message || "Check your details.", 422);
    await connectDB();
    if (parsed.data.name !== undefined) user.name = parsed.data.name;
    if (parsed.data.phone !== undefined) user.phone = parsed.data.phone;
    if (parsed.data.image !== undefined) user.image = parsed.data.image;
    await user.save();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
