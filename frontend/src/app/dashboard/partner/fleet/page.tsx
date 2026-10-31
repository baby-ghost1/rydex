import PartnerFleet from "@/components/dashboard/partner-fleet";
import { requireApprovedPartnerPage } from "@rydex/backend/lib/page-guards";

export const metadata = { title: "My fleet" };

export default async function PartnerFleetPage() {
  await requireApprovedPartnerPage("/dashboard/partner/fleet");
  return <PartnerFleet />;
}
