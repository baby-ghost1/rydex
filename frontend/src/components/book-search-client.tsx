"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  Loader2,
  MapPin,
  Navigation,
  Search,
  Settings2,
  Star,
  Users,
} from "lucide-react";
import CategoryTabs from "@/components/category-tabs";
import MapView from "@/components/map/map-view";
import SearchWidget from "@/components/search-widget";
import Modal from "@/components/ui/modal";
import { formatLocalDate } from "@/lib/date";
import { CATEGORY_MAP } from "@rydex/shared/constants";
import { inr, cn } from "@rydex/shared/utils";
import type { Place } from "@/components/location-input";
import type { VehicleDTO } from "@rydex/shared/types";
import type { MapPoint } from "@/components/map/map-inner";

export interface BookSearchProps {
  category: string;
  pickup: Place | null;
  drop: Place | null;
  date: string;
  time: string;
  query: string;
}

type NearbyVehicle = VehicleDTO & {
  distanceToPickupKm?: number | null;
  partnerOnline?: boolean;
};

export default function BookSearchClient({ initial }: { initial: BookSearchProps }) {
  const [category, setCategory] = useState(initial.category || "all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("rating");
  const [vehicles, setVehicles] = useState<NearbyVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [error, setError] = useState("");
  const [nearbyOnly, setNearbyOnly] = useState(Boolean(initial.pickup));
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);

  const searchPoint = initial.pickup || coords;

  function locateMe() {
    if (!navigator.geolocation) {
      setError("This browser does not support location search.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
        setNearbyOnly(true);
        setLocating(false);
      },
      () => {
        setError("We couldn't read your location. Allow location access or add a pickup address.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 30_000 },
    );
  }

  useEffect(() => {
    setPage(1);
  }, [category, sort, q, nearbyOnly]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");

      try {
        let res: Response;

        if (nearbyOnly && searchPoint) {
          const params = new URLSearchParams({
            lat: String(searchPoint.lat),
            lng: String(searchPoint.lng),
            maxDistanceKm: "50",
            page: String(page),
            limit: "8",
          });
          if (category !== "all") params.set("category", category);
          if (initial.drop) {
            params.set("dropLat", String(initial.drop.lat));
            params.set("dropLng", String(initial.drop.lng));
          }
          res = await fetch(`/api/vehicles/nearby?${params.toString()}`, {
            signal: controller.signal,
          });
        } else {
          const params = new URLSearchParams({
            page: String(page),
            limit: "8",
            sort,
          });
          if (category !== "all") params.set("category", category);
          if (q.trim()) params.set("q", q.trim());

          res = await fetch(`/api/vehicles?${params.toString()}`, {
            signal: controller.signal,
          });
        }

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not load vehicles");

        setVehicles((current) =>
          page > 1
            ? [...current, ...(data.vehicles || [])]
            : data.vehicles || [],
        );
        setPages(data.pagination?.pages || 1);
        setTotal(data.pagination?.total || 0);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Could not load vehicles");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [category, sort, q, page, nearbyOnly, searchPoint, initial.drop]);

  const mapPoints = useMemo(() => {
    const points: MapPoint[] = [];
    if (initial.pickup) {
      points.push({ ...initial.pickup, kind: "pickup", label: "P" });
    }
    if (initial.drop) {
      points.push({ ...initial.drop, kind: "drop", label: "D" });
    }
    for (const vehicle of vehicles.slice(0, 10)) {
      if (vehicle.location?.lat && vehicle.location?.lng) {
        points.push({
          lat: vehicle.location.lat,
          lng: vehicle.location.lng,
          kind: "vehicle",
          label:
            CATEGORY_MAP[vehicle.category]?.label.slice(0, 2).toUpperCase() ||
            "•",
        });
      }
    }
    return points;
  }, [vehicles, initial.pickup, initial.drop]);

  const checkoutQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (initial.pickup && initial.drop) {
      params.set("pickup", initial.pickup.address);
      params.set("pickupLat", String(initial.pickup.lat));
      params.set("pickupLng", String(initial.pickup.lng));
      params.set("drop", initial.drop.address);
      params.set("dropLat", String(initial.drop.lat));
      params.set("dropLng", String(initial.drop.lng));
      params.set("date", initial.date);
      params.set("time", initial.time);
    }
    return params.toString();
  }, [initial]);

  return (
    <div className="mx-auto max-w-7xl px-5 pb-20 text-fg sm:px-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow">Search results</p>
          <h1 className="type-h1 mt-3">
            {initial.pickup && initial.drop ? "Rides for your route." : "Find your ride."}
          </h1>

          {initial.pickup && initial.drop ? (
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-fg-muted">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-ink" aria-hidden="true" />
                {initial.pickup.address.split(",")[0]}
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-fg-subtle" aria-hidden="true" />
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full bg-lime ring-1 ring-ink/20"
                  aria-hidden="true"
                />
                {initial.drop.address.split(",")[0]}
              </span>
              <span className="text-fg-subtle" aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                {formatLocalDate(initial.date)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                {initial.time}
              </span>
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="btn-outline min-h-11 px-4 text-xs"
              >
                Modify search
              </button>
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-fg-muted">
              <span role="status" aria-live="polite">
                {loading ? "Loading available vehicles…" : `${total} verified vehicles available`}
              </span>
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="btn-outline min-h-11 px-4 text-xs"
              >
                Add pickup &amp; drop
              </button>
            </div>
          )}
        </div>

        <div className="relative w-full max-w-xs">
          <label htmlFor="book-search" className="sr-only">
            Search the fleet
          </label>
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle"
            aria-hidden="true"
          />
          <input
            id="book-search"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            className="input pl-10"
            placeholder="Search fleet…"
          />
        </div>
      </div>

      <div className="mt-7 flex flex-col gap-3 rounded-3xl border border-line bg-surface p-3 sm:flex-row sm:items-center sm:justify-between">
        <CategoryTabs value={category} onChange={setCategory} includeAll />

        <div className="flex flex-wrap items-center gap-2">
          {!initial.pickup && (
            <button
              type="button"
              onClick={locateMe}
              disabled={locating}
              className={cn(
                "inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-xs font-semibold transition",
                nearbyOnly && coords
                  ? "border-success/30 bg-success/10 text-success"
                  : "border-line-strong bg-surface text-fg-muted hover:text-ink",
              )}
            >
              {locating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Navigation className="h-3.5 w-3.5" />}
              Use my location
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (!nearbyOnly && !searchPoint) {
                locateMe();
                return;
              }
              setNearbyOnly((value) => !value);
            }}
            className={cn(
              "inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-xs font-semibold transition",
              nearbyOnly
                ? "border-success/30 bg-success/10 text-success"
                : "border-line-strong bg-surface text-fg-muted hover:text-ink",
            )}
            aria-pressed={nearbyOnly}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", nearbyOnly ? "bg-success" : "bg-line-strong")} />
            Online partners nearby
          </button>

          <label htmlFor="book-sort" className="sr-only">
            Sort vehicles
          </label>
          <select
            id="book-sort"
            value={sort}
            onChange={(event) => setSort(event.target.value)}
            className="min-h-11 shrink-0 rounded-full border border-line-strong bg-surface px-4 text-xs font-medium text-fg"
          >
            <option value="rating">Top rated</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
            <option value="newest">Newest</option>
          </select>
        </div>
      </div>

      {nearbyOnly && (
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1.5 text-[11px] text-fg-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          Showing only vehicles from partners who are online and accept rides {searchPoint ? "at your pickup point" : "near you"}.
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <div>
          {error && (
            <div
              role="alert"
              className="rounded-2xl border border-danger/20 bg-danger/5 px-5 py-4 text-sm text-danger"
            >
              {error}
            </div>
          )}

          <div className="space-y-3" aria-busy={loading}>
            {vehicles.map((vehicle) => (
              <Link
                key={vehicle._id}
                href={`/book/${vehicle._id}${checkoutQuery ? `?${checkoutQuery}` : ""}`}
                className="group flex flex-col gap-4 rounded-3xl border border-line bg-surface p-3 text-fg transition hover:border-line-strong hover:shadow-[0_14px_44px_rgba(0,0,0,0.08)] sm:flex-row"
              >
                <div className="relative aspect-[16/9] w-full shrink-0 overflow-hidden rounded-2xl bg-surface-muted sm:aspect-[4/3] sm:h-36 sm:w-44">
                  <Image
                    src={vehicle.image || "/vehicles/car.jpg"}
                    alt={vehicle.name}
                    fill
                    sizes="(max-width: 640px) 100vw, 176px"
                    className="object-cover transition duration-500 group-hover:scale-105 motion-reduce:transform-none"
                  />
                  <span className="absolute left-2.5 top-2.5 rounded-full bg-surface-muted/85 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur">
                    {CATEGORY_MAP[vehicle.category]?.label}
                  </span>
                </div>

                <div className="flex min-w-0 flex-1 flex-col justify-between py-1 pr-2">
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-bold tracking-tight text-fg">
                          {vehicle.name}
                        </h3>
                        <p className="mt-1 truncate text-xs text-fg-muted">
                          {typeof vehicle.owner === "object"
                            ? vehicle.owner.partnerProfile?.businessName ||
                              vehicle.owner.name
                            : "Verified partner"}
                          {vehicle.location?.address
                            ? ` · ${vehicle.location.address.split(",")[0]}`
                            : ""}
                        </p>
                      </div>
                      <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-fg">
                        <Star className="h-3.5 w-3.5 fill-ink" aria-hidden="true" />
                        {vehicle.rating ? vehicle.rating.toFixed(1) : "New"}
                      </span>
                    </div>

                    {nearbyOnly && vehicle.partnerOnline && (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
                          <span className="h-1.5 w-1.5 rounded-full bg-success" />
                          Partner online
                        </span>
                        {typeof vehicle.distanceToPickupKm === "number" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-medium text-fg-muted">
                            <Navigation className="h-3 w-3" />
                            {vehicle.distanceToPickupKm} km away
                          </span>
                        )}
                      </div>
                    )}

                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-fg-muted">
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
                      <span className="inline-flex items-center gap-1">
                        <Navigation className="h-3.5 w-3.5" aria-hidden="true" />
                        {vehicle.totalTrips} trips
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-end justify-between border-t border-line pt-3">
                    <div>
                      <p className="text-base font-extrabold text-fg">
                        {inr(vehicle.pricePerKm)}
                        <span className="text-xs font-normal text-fg-subtle">/km</span>
                      </p>
                      <p className="text-xs text-fg-subtle">
                        Base {inr(vehicle.baseFare)}
                      </p>
                    </div>
                    <span className="inline-flex min-h-11 items-center gap-1 rounded-full bg-ink px-4 text-xs font-semibold text-white transition group-hover:bg-lime group-hover:text-ink">
                      Book now
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {loading && (
            <div className="flex justify-center py-10">
              <Loader2
                className="h-5 w-5 animate-spin text-fg-subtle"
                aria-hidden="true"
              />
              <span className="sr-only" role="status">
                Loading rides
              </span>
            </div>
          )}

          {!loading && vehicles.length === 0 && !error && (
            <div className="rounded-3xl border border-dashed border-line-strong bg-surface-muted px-6 py-16 text-center">
              <MapPin className="mx-auto h-6 w-6 text-fg-subtle" aria-hidden="true" />
              <p className="font-display mt-3 text-lg font-bold text-fg">
                {nearbyOnly ? "No online partners nearby" : "No rides found"}
              </p>
              <p className="mt-1 text-sm text-fg-muted">
                {nearbyOnly
                  ? "Partners near this pickup are offline or outside their accepted range right now."
                  : "Try a different category or clear your search."}
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {nearbyOnly && (
                  <button type="button" onClick={() => setNearbyOnly(false)} className="btn-dark">
                    Show all vehicles
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setCategory("all");
                    setQ("");
                    if (!nearbyOnly) setNearbyOnly(Boolean(searchPoint));
                  }}
                  className="btn-outline"
                >
                  Clear filters
                </button>
              </div>
            </div>
          )}

          {page < pages && !loading && (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => setPage((value) => value + 1)}
                className="btn-outline px-7"
              >
                Show more rides
              </button>
            </div>
          )}
        </div>

        <div className="hidden lg:block">
          <div className="sticky top-28 overflow-hidden rounded-3xl border border-line bg-surface p-2">
            <div className="h-[calc(100vh-10rem)] min-h-[420px] overflow-hidden rounded-2xl">
              <MapView points={mapPoints} fit />
            </div>
            <div className="flex items-center gap-4 px-3 py-2.5 text-xs text-fg-muted">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-ink" aria-hidden="true" />
                Pickup
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full bg-lime ring-1 ring-ink/20"
                  aria-hidden="true"
                />
                Drop
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-danger" aria-hidden="true" />
                Nearby vehicles
              </span>
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        labelledBy="edit-search-title"
        label="Change your route"
        className="max-w-3xl"
      >
        <div className="mb-4 pr-12">
          <p className="eyebrow">Update your trip</p>
          <h2 id="edit-search-title" className="font-display mt-1 text-2xl font-extrabold tracking-tight text-fg">
            Change your route
          </h2>
        </div>
        <SearchWidget />
      </Modal>
    </div>
  );
}
