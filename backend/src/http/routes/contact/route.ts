import { NextResponse } from "next/server";
import { contactSchema } from "@rydex/shared/validation";
import { handleApiError, jsonError } from "@rydex/backend/lib/auth-helpers";
import { connectDB } from "@rydex/backend/lib/db";
import { ContactMessage } from "@rydex/backend/models/contact.model";
import { sendContactEmail } from "@rydex/backend/lib/email";
import { clientIp, rateLimit } from "@rydex/backend/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const limit = rateLimit(`contact:${clientIp(request)}`, 4, 60_000);
    if (!limit.allowed) return jsonError("Too many messages. Please wait a minute.", 429);
    const parsed = contactSchema.safeParse(await request.json());
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message || "Check your message.", 422);
    }
    await connectDB();
    await ContactMessage.create(parsed.data);
    await sendContactEmail(parsed.data).catch((error) => console.warn("[contact email]", error));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
