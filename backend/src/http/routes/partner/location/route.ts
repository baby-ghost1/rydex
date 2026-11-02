import { z } from "zod";
import { connectDB } from "@rydex/backend/lib/db";
import { User } from "@rydex/backend/models/user.model";
import { requireUser, handleApiError, jsonError } from "@rydex/backend/lib/auth-helpers";
import { clientIp, rateLimit } from "@rydex/backend/lib/rate-limit";

const schema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  isOnline: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    if (user.role !== "partner" && user.role !== "admin") {
      return jsonError("Partner access only.", 403);
    }
    if (user.partnerStatus !== "approved" && user.role !== "admin") {
      return jsonError("Your partner account must be approved first.", 403);
    }

    const limit = rateLimit(`partner:location:${clientIp(request)}:${user._id}`, 60, 60_000);
    if (!limit.allowed) return jsonError("Location updates are too frequent.", 429);

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return jsonError("Valid coordinates are required.", 422);

    await connectDB();
    const { lat, lng, isOnline } = parsed.data;

    const update: Record<string, unknown> = {
      "partnerProfile.currentLocation.lat": lat,
      "partnerProfile.currentLocation.lng": lng,
      "partnerProfile.currentLocation.updatedAt": new Date(),
    };
    if (typeof isOnline === "boolean") {
      update["partnerProfile.currentLocation.isOnline"] = isOnline;
    }

    await User.updateOne({ _id: user._id }, { $set: update });

    return Response.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}