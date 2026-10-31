import PublicShell from "@/components/public-shell";
import FleetBrowser from "@/components/fleet-browser";

export const metadata = {
  title: "Fleet",
  description: "Browse verified bikes, cars, autos, loading vehicles and trucks on RYDEX.",
};

export default function FleetPage() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-7xl px-5 pb-20 sm:px-8">
        <FleetBrowser />
      </div>
    </PublicShell>
  );
}
