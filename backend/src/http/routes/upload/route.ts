import { NextResponse } from "next/server";
import { handleApiError, jsonError, requireUser } from "@rydex/backend/lib/auth-helpers";
import { saveUpload } from "@rydex/backend/lib/upload";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await requireUser();
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return jsonError("Choose a file to upload.", 422);
    const result = await saveUpload(file);
    return NextResponse.json({ ok: true, url: result.url, provider: result.provider });
  } catch (error) {
    return handleApiError(error);
  }
}
