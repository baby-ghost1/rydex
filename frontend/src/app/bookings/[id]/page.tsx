import PublicShell from "@/components/public-shell";
import RideDetailClient from "@/components/ride-detail-client";

export const metadata = { title: "Your ride" };

export default async function RidePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PublicShell>
      <RideDetailClient bookingId={id} />
    </PublicShell>
  );
}
