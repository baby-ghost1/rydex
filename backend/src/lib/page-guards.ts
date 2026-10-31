import { redirect } from "next/navigation";
import { auth } from "@rydex/backend/auth";
import { connectDB } from "@rydex/backend/lib/db";
import { User } from "@rydex/backend/models/user.model";

/**
 * Server-side access checks for dashboard pages. These always read the current
 * user from MongoDB so a stale JWT cannot grant access after a role/status
 * change.
 */
export async function requirePageUser(callbackUrl: string) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  await connectDB();
  const user = await User.findById(session.user.id);
  if (!user) redirect("/login");
  return user;
}

export async function requireApprovedPartnerPage(callbackUrl: string) {
  const user = await requirePageUser(callbackUrl);
  if (user.role === "admin") redirect("/dashboard/admin");
  if (user.role !== "partner" || user.partnerStatus !== "approved") {
    redirect("/dashboard/partner/onboarding");
  }
  return user;
}

export async function requireOnboardingPage() {
  const user = await requirePageUser("/dashboard/partner/onboarding");
  if (user.role === "admin") redirect("/dashboard/admin");
  if (user.partnerStatus === "approved") redirect("/dashboard/partner");
  return user;
}
