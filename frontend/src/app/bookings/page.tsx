import PublicShell from "@/components/public-shell";
import BookingsClient from "@/components/bookings-client";

export const metadata = { title: "My bookings" };

export default function BookingsPage() {
  return (
    <PublicShell>
      <BookingsClient />
    </PublicShell>
  );
}
