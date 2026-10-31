import PartnerRequests from "@/components/dashboard/partner-requests";
import { requireApprovedPartnerPage } from "@rydex/backend/lib/page-guards";

export const metadata = { title: "Ride requests" };

export default async function PartnerRequestsPage() {
  await requireApprovedPartnerPage("/dashboard/partner/requests");
  return <PartnerRequests />;
}
