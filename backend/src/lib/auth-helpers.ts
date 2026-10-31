import { NextResponse } from "next/server";
import { auth } from "@rydex/backend/auth";
import { connectDB } from "@rydex/backend/lib/db";
import { User } from "@rydex/backend/models/user.model";
import type { UserRole } from "@rydex/shared/types";

export { parsePagination } from "@rydex/backend/lib/pagination";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export function jsonError(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status });
}

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, ...data }, { status });
}

export async function getSessionUserId() {
  const session = await auth();
  return session?.user?.id || null;
}

export async function requireUser() {
  const userId = await getSessionUserId();
  if (!userId) throw new ApiError("You need to sign in to continue.", 401);
  await connectDB();
  const user = await User.findById(userId);
  if (!user) throw new ApiError("Your account could not be found.", 401);
  return user;
}

export async function requireRole(roles: UserRole[]) {
  const user = await requireUser();
  if (!roles.includes(user.role as UserRole)) {
    throw new ApiError("You do not have permission to do that.", 403);
  }
  return user;
}

export function handleApiError(error: unknown) {
  if (error instanceof ApiError) {
    return jsonError(error.message, error.status);
  }
  if (error instanceof Error && /duplicate key/i.test(error.message)) {
    return jsonError("That record already exists. Check the registration or account number.", 409);
  }
  console.error("[api]", error);
  const message =
    process.env.NODE_ENV === "production"
      ? "Something went wrong. Please try again."
      : error instanceof Error
        ? error.message
        : "Unknown error";
  return jsonError(message, 500);
}
