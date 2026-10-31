import OnboardingWizard from "@/components/dashboard/onboarding-wizard";
import { requireOnboardingPage } from "@rydex/backend/lib/page-guards";

export const metadata = { title: "Partner onboarding" };

export default async function PartnerOnboardingPage() {
  await requireOnboardingPage();
  return <OnboardingWizard />;
}
