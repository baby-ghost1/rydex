import PartnerRides from "@/components/dashboard/partner-rides";
import { requireApprovedPartnerPage } from "@rydex/backend/lib/page-guards";

export const metadata = { title: "Partner rides" };

export default async function PartnerRidesPage() {
  await requireApprovedPartnerPage("/dashboard/partner/rides");
  return <PartnerRides />;
}
