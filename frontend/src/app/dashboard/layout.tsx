import { redirect } from "next/navigation";
import { auth } from "@rydex/backend/auth";
import DashboardShell from "@/components/dashboard/dashboard-shell";

export const metadata = {
  title: { default: "Dashboard", template: "%s · RYDEX" },
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/dashboard");

  return (
    <DashboardShell
      user={{
        id: session.user.id,
        name: session.user.name || "RYDEX member",
        email: session.user.email || "",
        image: session.user.image || null,
        role: session.user.role,
        partnerStatus: session.user.partnerStatus,
      }}
    >
      {children}
    </DashboardShell>
  );
}
