import PartnerEarnings from "@/components/dashboard/partner-earnings";
import { requireApprovedPartnerPage } from "@rydex/backend/lib/page-guards";

export const metadata = { title: "Earnings" };

export default async function PartnerEarningsPage() {
  await requireApprovedPartnerPage("/dashboard/partner/earnings");
  return <PartnerEarnings />;
}
