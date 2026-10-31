import { redirect } from "next/navigation";
import { auth } from "@rydex/backend/auth";

export default async function DashboardIndex() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role === "admin") redirect("/dashboard/admin");
  if (session.user.role === "partner") redirect("/dashboard/partner");
  redirect("/dashboard/user");
}
