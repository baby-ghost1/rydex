"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import VehicleCard from "@/components/vehicle-card";
import type { VehicleDTO } from "@rydex/shared/types";

export default function FeaturedFleet() {
  const [vehicles, setVehicles] = useState<VehicleDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/vehicles?sort=rating&limit=6", { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => setVehicles(data.vehicles || []))
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  return (
    <section
      className="mx-auto max-w-7xl bg-surface px-5 py-20 text-fg sm:px-8 sm:py-24"
      id="fleet"
    >
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Top rated near you</p>
          <h2 className="type-h2 mt-3">Featured fleet</h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-fg-muted">
            Handpicked vehicles from verified partners - fully insured, inspected
            and ready for your next trip.
          </p>
        </div>
        <Link href="/fleet" className="btn-outline shrink-0 self-start sm:self-auto">
          Explore all vehicles
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {loading
          ? Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-3xl border border-line bg-surface"
              >
                <div className="skeleton aspect-[4/3] rounded-none" />
                <div className="space-y-3 p-5">
                  <div className="skeleton h-4 w-2/3" />
                  <div className="skeleton h-3 w-1/3" />
                  <div className="skeleton h-8 w-full" />
                </div>
              </div>
            ))
          : vehicles.map((vehicle) => (
              <VehicleCard key={vehicle._id} vehicle={vehicle} />
            ))}
      </div>

      {!loading && vehicles.length === 0 && (
        <div className="mt-10 rounded-3xl border border-dashed border-line-strong bg-surface-muted px-6 py-16 text-center">
          <p className="font-display text-xl font-bold text-fg">
            Fleet is being prepared
          </p>
          <p className="mt-2 text-sm text-fg-muted">
            Seed the demo database or approve a partner to see vehicles here.
          </p>
        </div>
      )}
    </section>
  );
}
