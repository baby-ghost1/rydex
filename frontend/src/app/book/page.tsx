import PublicShell from "@/components/public-shell";
import BookSearchClient, { type BookSearchProps } from "@/components/book-search-client";

export const metadata = { title: "Book a vehicle" };

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function coordinate(value: string | string[] | undefined) {
  const number = Number(first(value));
  return Number.isFinite(number) ? number : null;
}

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const pickupLat = coordinate(params.pickupLat);
  const pickupLng = coordinate(params.pickupLng);
  const dropLat = coordinate(params.dropLat);
  const dropLng = coordinate(params.dropLng);
  const pickupAddress = first(params.pickup);
  const dropAddress = first(params.drop);

  const initial: BookSearchProps = {
    category: first(params.category) || "all",
    pickup:
      pickupAddress && pickupLat !== null && pickupLng !== null
        ? { address: pickupAddress, lat: pickupLat, lng: pickupLng }
        : null,
    drop:
      dropAddress && dropLat !== null && dropLng !== null
        ? { address: dropAddress, lat: dropLat, lng: dropLng }
        : null,
    date: first(params.date) || "",
    time: first(params.time) || "10:00",
    query: "",
  };

  return (
    <PublicShell>
      <BookSearchClient initial={initial} />
    </PublicShell>
  );
}
