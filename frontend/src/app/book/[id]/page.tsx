import PublicShell from "@/components/public-shell";
import CheckoutClient from "@/components/checkout-client";

export const metadata = { title: "Confirm your ride" };

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function coordinate(value: string | string[] | undefined) {
  const number = Number(first(value));
  return Number.isFinite(number) ? number : null;
}

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const pickupLat = coordinate(query.pickupLat);
  const pickupLng = coordinate(query.pickupLng);
  const dropLat = coordinate(query.dropLat);
  const dropLng = coordinate(query.dropLng);
  const pickupAddress = first(query.pickup);
  const dropAddress = first(query.drop);

  return (
    <PublicShell>
      <CheckoutClient
        vehicleId={id}
        initial={{
          pickup:
            pickupAddress && pickupLat !== null && pickupLng !== null
              ? { address: pickupAddress, lat: pickupLat, lng: pickupLng }
              : null,
          drop:
            dropAddress && dropLat !== null && dropLng !== null
              ? { address: dropAddress, lat: dropLat, lng: dropLng }
              : null,
          date: first(query.date) || "",
          time: first(query.time) || "10:00",
        }}
      />
    </PublicShell>
  );
}
