import { redirect } from "next/navigation";
import { auth } from "@rydex/backend/auth";
import PartnerPresence from "@/components/dashboard/partner-presence";

export default async function PartnerDashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/dashboard/partner");
  if (session.user.role === "admin") redirect("/dashboard/admin");

  return (
    <>
      {children}
      {session.user.role === "partner" && session.user.partnerStatus === "approved" && <PartnerPresence />}
    </>
  );
}
