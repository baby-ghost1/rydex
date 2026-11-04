"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Fuel, MapPin, Settings2, Star, Users } from "lucide-react";
import type { VehicleDTO } from "@rydex/shared/types";
import { CATEGORY_MAP } from "@rydex/shared/constants";
import { inr } from "@rydex/shared/utils";

export default function VehicleCard({
  vehicle,
  href,
  compact = false,
}: {
  vehicle: VehicleDTO;
  href?: string;
  compact?: boolean;
}) {
  const owner =
    typeof vehicle.owner === "object" && vehicle.owner
      ? vehicle.owner.name || vehicle.owner.partnerProfile?.businessName
      : "Verified partner";
  const link = href || `/book/${vehicle._id}`;

  return (
    <Link
      href={link}
      aria-label={`View ${vehicle.name}, ${inr(vehicle.pricePerKm)} per kilometre`}
      className="group surface-default flex h-full flex-col overflow-hidden rounded-3xl border border-line shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition duration-300 hover:-translate-y-1 hover:border-line-strong hover:shadow-[0_20px_60px_rgba(0,0,0,0.10)] active:translate-y-0 active:shadow-sm motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-muted">
        <Image
          src={vehicle.image || "/vehicles/car.jpg"}
          alt={vehicle.name}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover transition duration-700 group-hover:scale-[1.04]"
        />

        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3.5">
          <span className="max-w-[70%] truncate rounded-full bg-ink px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white shadow-sm">
            {CATEGORY_MAP[vehicle.category]?.label || vehicle.category}
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-lime px-2.5 py-1 text-xs font-bold text-ink shadow-sm ring-1 ring-ink/10">
            <Star className="h-3 w-3 fill-ink" aria-hidden="true" />
            {vehicle.rating ? vehicle.rating.toFixed(1) : "New"}
            <span className="sr-only">
              {vehicle.rating ? "rating" : "listing"}
            </span>
          </span>
        </div>

        {vehicle.totalTrips > 0 && (
          <span className="absolute bottom-3.5 left-3.5 rounded-full bg-surface/95 px-2.5 py-1 text-xs font-semibold text-fg shadow-sm ring-1 ring-ink/10 backdrop-blur-sm">
            {vehicle.totalTrips} trips
          </span>
        )}

        <span
          className="absolute bottom-3.5 right-3.5 grid h-10 w-10 place-items-center rounded-full bg-lime text-ink shadow-sm transition duration-300 group-hover:scale-105"
          aria-hidden="true"
        >
          <ArrowUpRight className="h-4 w-4" />
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold tracking-tight text-fg">
              {vehicle.name}
            </h3>
            <p className="mt-1 truncate text-xs text-fg-muted">
              {owner}
              {vehicle.location?.address
                ? ` · ${vehicle.location.address.split(",")[0]}`
                : ""}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-lg font-extrabold tracking-tight text-fg">
              {inr(vehicle.pricePerKm)}
            </p>
            <p className="text-xs text-fg-subtle">per km</p>
          </div>
        </div>

        {!compact && (
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-4 text-xs text-fg-muted">
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              {vehicle.seats} seats
            </span>
            {vehicle.transmission && (
              <span className="inline-flex items-center gap-1 capitalize">
                <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />
                {vehicle.transmission}
              </span>
            )}
            {vehicle.fuel && (
              <span className="inline-flex items-center gap-1 capitalize">
                <Fuel className="h-3.5 w-3.5" aria-hidden="true" />
                {vehicle.fuel}
              </span>
            )}
            {vehicle.location?.address && (
              <span className="ml-auto inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                Ready nearby
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
