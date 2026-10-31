import { redirect } from "next/navigation";
import { auth } from "@rydex/backend/auth";

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/dashboard/admin");
  if (session.user.role !== "admin") redirect("/dashboard");

  return children;
}
