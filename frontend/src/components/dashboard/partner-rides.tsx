"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CarFront,
  CheckCircle2,
  Clock3,
  CreditCard,
  PackageOpen,
  RefreshCw,
  Route as RouteIcon,
  Search,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/ui";
import StatusBadge from "@/components/status-badge";
import { api } from "@/lib/client-api";
import { cn, formatDate, inr } from "@rydex/shared/utils";

interface RideRow {
  _id: string;
  status: string;
  paymentMethod: "cash" | "online";
  paymentStatus: string;
  date: string;
  time: string;
  distanceKm: number;
  durationMin: number;
  createdAt: string;
  fare: { total: number; partnerEarning: number };
  pickup: { address: string };
  drop: { address: string };
  vehicle?: { name: string; image: string; registrationNumber?: string } | null;
  user?: { name: string; phone?: string; image?: string } | null;
}

const tabs = [
  { key: "all", label: "All rides" },
  { key: "active", label: "Active" },
  { key: "pending", label: "Requests" },
  { key: "completed", label: "Completed" },
  { key: "closed", label: "Cancelled" },
];

export default function PartnerRides() {
  const [rides, setRides] = useState<RideRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");

  async function load(silent = false) {
    if (!silent) setRefreshing(true);
    try {
      const data = await api<{ bookings: RideRow[] }>("/api/bookings?as=partner&limit=50");
      setRides(data.bookings || []);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load your rides.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(() => load(true), 30_000);
    return () => clearInterval(interval);
  }, []);

  const counts = useMemo(
    () => ({
      all: rides.length,
      active: rides.filter((ride) => ["accepted", "arrived", "started"].includes(ride.status)).length,
      pending: rides.filter((ride) => ride.status === "pending").length,
      completed: rides.filter((ride) => ride.status === "completed").length,
      closed: rides.filter((ride) => ["cancelled", "rejected"].includes(ride.status)).length,
    }),
    [rides],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rides.filter((ride) => {
      if (tab === "active" && !["accepted", "arrived", "started"].includes(ride.status)) return false;
      if (tab === "pending" && ride.status !== "pending") return false;
      if (tab === "completed" && ride.status !== "completed") return false;
      if (tab === "closed" && !["cancelled", "rejected"].includes(ride.status)) return false;
      if (!needle) return true;
      return [
        ride._id,
        ride.user?.name,
        ride.vehicle?.name,
        ride.vehicle?.registrationNumber,
        ride.pickup.address,
        ride.drop.address,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
    });
  }, [rides, tab, query]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Ride management"
        title="Every ride, one place."
        description="Track active trips, revisit completed rides and review cancellations across your fleet."
        actions={
          <>
            <button type="button" onClick={() => load()} disabled={refreshing} className="btn-outline">
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} /> Refresh
            </button>
            <Link href="/dashboard/partner/requests" className="btn-dark">
              Request queue <ArrowRight className="h-4 w-4" />
            </Link>
          </>
        }
      />

      {error && <p className="rounded-2xl border border-danger/15 bg-danger/5 px-4 py-3 text-xs text-danger">{error}</p>}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: "Active", value: counts.active, icon: Clock3, tone: "bg-ink text-white" },
          { label: "Requests", value: counts.pending, icon: CalendarDays, tone: "bg-white" },
          { label: "Completed", value: counts.completed, icon: CheckCircle2, tone: "bg-white" },
          { label: "Earned", value: inr(rides.filter((ride) => ride.status === "completed").reduce((sum, ride) => sum + ride.fare.partnerEarning, 0)), icon: CreditCard, tone: "bg-lime" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className={cn("rounded-2xl border border-line p-4", item.tone)}>
              <div className="flex items-center justify-between">
                <p className={cn("text-[10px] font-semibold uppercase tracking-wider", item.tone === "bg-ink text-white" ? "text-fg-inverse-subtle" : "text-fg-subtle")}>{item.label}</p>
                <Icon className={cn("h-3.5 w-3.5", item.tone === "bg-ink text-white" ? "text-lime" : "text-fg-subtle")} />
              </div>
              <p className="font-display mt-2 text-xl font-extrabold tracking-tight sm:text-2xl">{loading ? "-" : item.value}</p>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="no-scrollbar flex gap-1 overflow-x-auto rounded-full border border-line bg-white p-1.5">
          {tabs.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={cn(
                "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold transition",
                tab === item.key ? "bg-ink text-white" : "text-fg-muted hover:bg-surface-muted hover:text-ink",
              )}
            >
              {item.label}
              <span className={cn("rounded-full px-1.5 py-0.5 text-[10px]", tab === item.key ? "bg-lime text-ink" : "bg-surface-muted text-fg-muted")}>
                {counts[item.key as keyof typeof counts]}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full lg:max-w-xs">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-subtle" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="input !rounded-full !py-2.5 pl-9 pr-12 text-xs"
            placeholder="Search rider, route or booking ID"
            aria-label="Search rides"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} className="absolute right-1 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full text-fg-subtle transition hover:bg-surface-muted hover:text-ink" aria-label="Clear search">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2.5">
        {loading &&
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="skeleton h-32 rounded-2xl bg-white" />
          ))}

        {!loading &&
          filtered.map((ride) => (
            <Link
              key={ride._id}
              href={`/bookings/${ride._id}`}
              className="group grid gap-3 rounded-2xl border border-line bg-white p-3 transition hover:border-line-strong hover:shadow-sm sm:grid-cols-[80px_1fr_auto] sm:items-center sm:p-4"
            >
              <div className="relative h-28 w-full shrink-0 overflow-hidden rounded-xl bg-surface-muted sm:h-16 sm:w-20">
                {ride.vehicle?.image ? (
                  <Image src={ride.vehicle.image} alt="" fill sizes="80px" className="object-cover" />
                ) : (
                  <div className="grid h-full place-items-center"><CarFront className="h-4 w-4 text-fg-subtle" /></div>
                )}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={ride.status} dot={false} className="!px-2 !py-0.5 !text-[10px]" />
                  <span className="text-[10px] text-fg-subtle">#{ride._id.slice(-8).toUpperCase()}</span>
                  {ride.paymentMethod === "online" && ride.paymentStatus === "pending" && ride.status === "pending" && (
                    <span className="text-[10px] font-semibold text-warning">Payment pending</span>
                  )}
                </div>
                <p className="mt-1.5 truncate text-sm font-bold">
                  {ride.user?.name || "RYDEX rider"} <span className="font-normal text-fg-subtle">·</span>{" "}
                  <span className="text-xs font-medium text-fg-muted">{ride.vehicle?.name || "Vehicle"}</span>
                </p>
                <p className="mt-1 truncate text-[10px] text-fg-muted">
                  {ride.pickup.address.split(",")[0]} → {ride.drop.address.split(",")[0]}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-fg-subtle">
                  <span className="inline-flex items-center gap-1"><CalendarDays className="h-2.5 w-2.5" /> {formatDate(ride.date)} · {ride.time}</span>
                  <span className="inline-flex items-center gap-1"><RouteIcon className="h-2.5 w-2.5" /> {ride.distanceKm} km · {ride.durationMin} min</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 border-t border-line pt-3 sm:block sm:border-0 sm:pl-4 sm:pt-0 sm:text-right">
                <div>
                  <p className="text-[10px] text-fg-subtle">{ride.status === "completed" ? "You earned" : "Total fare"}</p>
                  <p className="text-sm font-extrabold">{inr(ride.status === "completed" ? ride.fare.partnerEarning : ride.fare.total)}</p>
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-fg-muted group-hover:text-ink">
                  Manage <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </Link>
          ))}
      </div>

      {!loading && filtered.length === 0 && (
        <div className="rounded-3xl border border-dashed border-line bg-surface/60 px-6 py-20 text-center">
          <PackageOpen className="mx-auto h-6 w-6 text-fg-subtle" />
          <p className="font-display mt-3 text-xl font-bold">{query ? "No matching rides" : "No rides in this view"}</p>
          <p className="mt-1 text-xs text-fg-muted">
            {query ? "Try a different name, route or booking ID." : "Rides will appear here as soon as they are booked."}
          </p>
          {query ? (
            <button type="button" onClick={() => setQuery("")} className="btn-outline mt-5">Clear search</button>
          ) : (
            <Link href="/dashboard/partner/requests" className="btn-dark mt-5">Open request queue</Link>
          )}
        </div>
      )}

      {!loading && rides.length >= 50 && (
        <p className="text-center text-[10px] text-fg-subtle">Showing the 50 most recent rides.</p>
      )}
    </div>
  );
}
