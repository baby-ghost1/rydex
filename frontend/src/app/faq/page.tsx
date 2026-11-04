import PublicShell from "@/components/public-shell";
import HomeFaq from "@/components/home/home-faq";

export const metadata = { title: "FAQs" };

export default function FaqPage() {
  return (
    <PublicShell>
      <HomeFaq />
    </PublicShell>
  );
}
