import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@rydex/backend/lib/db";
import { Vehicle } from "@rydex/backend/models/vehicle.model";
import { Booking } from "@rydex/backend/models/booking.model";
import { requireUser, handleApiError, jsonError } from "@rydex/backend/lib/auth-helpers";
import { vehicleSchema } from "@rydex/shared/validation";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return jsonError("Vehicle not found.", 404);
    await connectDB();
    const vehicle = await Vehicle.findById(id)
      .populate("owner", "name image partnerProfile.businessName partnerProfile.ownerName")
      .lean();
    if (!vehicle) return jsonError("Vehicle not found.", 404);
    if (!vehicle.approved || !vehicle.available) {
      // Only the owner/admin may see an unlisted vehicle.
      try {
        const user = await requireUser();
        const ownerId =
          typeof vehicle.owner === "object" && vehicle.owner
            ? String((vehicle.owner as { _id?: unknown })._id)
            : String(vehicle.owner);
        if (user.role !== "admin" && String(user._id) !== ownerId) {
          return jsonError("Vehicle not found.", 404);
        }
      } catch {
        return jsonError("Vehicle not found.", 404);
      }
    }
    return NextResponse.json({ ok: true, vehicle });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return jsonError("Vehicle not found.", 404);
    await connectDB();
    const vehicle = await Vehicle.findById(id);
    if (!vehicle) return jsonError("Vehicle not found.", 404);
    if (user.role !== "admin" && String(vehicle.owner) !== String(user._id)) {
      return jsonError("You can only edit your own vehicles.", 403);
    }

    const parsed = vehicleSchema.partial().safeParse(await request.json());
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message || "Check the vehicle details.", 422);
    }
    const updates = { ...parsed.data } as Record<string, unknown>;
    if (user.role !== "admin") {
      delete updates.approved;
    }
    Object.assign(vehicle, updates);
    await vehicle.save();
    return NextResponse.json({ ok: true, vehicle });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return jsonError("Vehicle not found.", 404);
    await connectDB();
    const vehicle = await Vehicle.findById(id);
    if (!vehicle) return jsonError("Vehicle not found.", 404);
    if (user.role !== "admin" && String(vehicle.owner) !== String(user._id)) {
      return jsonError("You can only remove your own vehicles.", 403);
    }
    const active = await Booking.exists({
      vehicle: vehicle._id,
      status: { $in: ["pending", "accepted", "arrived", "started"] },
    });
    if (active) {
      return jsonError("This vehicle has an active booking. Complete it before removing the vehicle.", 409);
    }
    await vehicle.deleteOne();
    return NextResponse.json({ ok: true, deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
