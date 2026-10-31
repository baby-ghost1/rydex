"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Search, SlidersHorizontal } from "lucide-react";
import VehicleCard from "@/components/vehicle-card";
import CategoryTabs from "@/components/category-tabs";
import type { VehicleDTO } from "@rydex/shared/types";
import { inr } from "@rydex/shared/utils";

export default function FleetBrowser({
  initialCategory = "",
}: {
  initialCategory?: string;
}) {
  const [vehicles, setVehicles] = useState<VehicleDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState(initialCategory || "all");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [sort, setSort] = useState("rating");
  const [maxPrice, setMaxPrice] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQ(q), 350);
    return () => window.clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    setPage(1);
  }, [category, debouncedQ, sort, maxPrice]);

  const load = useCallback(
    async (targetPage: number, append: boolean, signal: AbortSignal) => {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({
          page: String(targetPage),
          limit: "9",
          sort,
        });
        if (category !== "all") params.set("category", category);
        if (debouncedQ) params.set("q", debouncedQ);
        if (maxPrice > 0) params.set("maxPrice", String(maxPrice));

        const res = await fetch(`/api/vehicles?${params.toString()}`, { signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not load vehicles");

        setVehicles((current) =>
          append ? [...current, ...(data.vehicles || [])] : data.vehicles || [],
        );
        setPages(data.pagination?.pages || 1);
        setTotal(data.pagination?.total || 0);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Could not load vehicles");
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    },
    [category, debouncedQ, sort, maxPrice],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(page, page > 1, controller.signal);
    return () => controller.abort();
  }, [load, page]);

  return (
    <div className="text-fg">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow">Browse the marketplace</p>
          <h1 className="type-h1 mt-3">The complete fleet.</h1>
          <p className="mt-3 text-sm text-fg-muted" role="status" aria-live="polite">
            {loading && vehicles.length === 0
              ? "Loading available vehicles…"
              : `${total} verified vehicle${total === 1 ? "" : "s"} ready to book`}
          </p>
        </div>

        <div className="relative w-full max-w-xs">
          <label htmlFor="fleet-search" className="sr-only">
            Search vehicles
          </label>
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle"
            aria-hidden="true"
          />
          <input
            id="fleet-search"
            className="input pl-10"
            placeholder="Search cars, bikes, brands…"
            value={q}
            onChange={(event) => setQ(event.target.value)}
          />
        </div>
      </div>

      <div className="mt-8 rounded-3xl border border-line bg-surface p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <CategoryTabs value={category} onChange={setCategory} includeAll />

          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-fg-subtle">
              <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
              Filter
            </span>

            <label htmlFor="fleet-price" className="sr-only">
              Maximum price per kilometre
            </label>
            <select
              id="fleet-price"
              value={maxPrice}
              onChange={(event) => setMaxPrice(Number(event.target.value))}
              className="min-h-11 rounded-full border border-line-strong bg-surface px-4 text-xs font-medium text-fg"
            >
              <option value={0}>Any price</option>
              <option value={8}>Up to {inr(8)}/km</option>
              <option value={12}>Up to {inr(12)}/km</option>
              <option value={18}>Up to {inr(18)}/km</option>
              <option value={30}>Up to {inr(30)}/km</option>
            </select>

            <label htmlFor="fleet-sort" className="sr-only">
              Sort vehicles
            </label>
            <select
              id="fleet-sort"
              value={sort}
              onChange={(event) => setSort(event.target.value)}
              className="min-h-11 rounded-full border border-line-strong bg-surface px-4 text-xs font-medium text-fg"
            >
              <option value="rating">Top rated</option>
              <option value="newest">Newest first</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-6 rounded-2xl border border-danger/20 bg-danger/5 px-5 py-4 text-sm text-danger"
        >
          {error}
        </div>
      )}

      <div
        className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
        aria-busy={loading}
      >
        {vehicles.map((vehicle) => (
          <VehicleCard key={vehicle._id} vehicle={vehicle} />
        ))}
      </div>

      {loading && (
        <div className="mt-10 flex justify-center">
          <Loader2
            className="h-5 w-5 animate-spin text-fg-subtle"
            aria-hidden="true"
          />
          <span className="sr-only" role="status">
            Loading vehicles
          </span>
        </div>
      )}

      {!loading && vehicles.length === 0 && !error && (
        <div className="mt-8 rounded-3xl border border-dashed border-line-strong bg-surface-muted px-6 py-20 text-center">
          <p className="font-display text-xl font-bold text-fg">
            No vehicles match those filters
          </p>
          <p className="mt-2 text-sm text-fg-muted">
            Try another category, price range or search term.
          </p>
          <button
            type="button"
            onClick={() => {
              setCategory("all");
              setQ("");
              setMaxPrice(0);
            }}
            className="btn-dark mt-6"
          >
            Clear filters
          </button>
        </div>
      )}

      {page < pages && !loading && (
        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={() => setPage((p) => p + 1)}
            className="btn-outline px-8"
          >
            Load more vehicles
          </button>
        </div>
      )}
    </div>
  );
}
