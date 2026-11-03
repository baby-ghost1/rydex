"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  ArrowRight,
  BadgeIndianRupee,
  Bike,
  CalendarCheck2,
  CarFront,
  ChevronRight,
  Clock3,
  Gauge,
  MapPin,
  Package,
  Plus,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { PageHeader, SectionHeader, StatCard, EmptyState } from "@/components/dashboard/ui";
import { MiniBarChart } from "@/components/dashboard/mini-charts";
import StatusBadge from "@/components/status-badge";
import { api } from "@/lib/client-api";
import { cn, formatDate, inr, timeAgo } from "@rydex/shared/utils";
import type { PartnerStatus, VehicleCategory } from "@rydex/shared/types";

interface PartnerStats {
  pending: number;
  accepted: number;
  arrived: number;
  started: number;
  completed: number;
  active: number;
  gross: number;
  net: number;
  platform: number;
  trips: number;
  vehicles: number;
  rating: number;
  ratingCount: number;
}

interface RecentRide {
  _id: string;
  status: string;
  date: string;
  time: string;
  distanceKm: number;
  fare: { total: number; partnerEarning: number };
  pickup: { address: string };
  drop: { address: string };
  vehicle?: { name: string; image: string; category: VehicleCategory } | null;
  user?: { name: string; image?: string } | null;
  createdAt: string;
}

interface StatsResponse {
  stats: PartnerStats;
  months: Array<{ label: string; net: number; trips: number }>;
  recent: RecentRide[];
  partnerStatus: PartnerStatus;
}

export default function PartnerOverview() {
  const { data: session } = useSession();
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function load(silent = false) {
    if (!silent) setRefreshing(true);
    try {
      const result = await api<StatsResponse>("/api/partner/stats");
      setData(result);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load your partner dashboard.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(() => load(), 30_000);
    return () => clearInterval(interval);
  }, []);

  const stats = data?.stats;
  const status = data?.partnerStatus || session?.user.partnerStatus || "none";
  const firstName = session?.user.name?.split(" ")[0] || "partner";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const chart = useMemo(
    () => (data?.months || []).map((month) => ({ label: month.label, value: month.net, hint: `${month.trips} trips` })),
    [data?.months],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`${greeting}, ${firstName}`}
        title={
          status === "approved"
            ? stats?.pending
              ? `${stats.pending} request${stats.pending === 1 ? "" : "s"} waiting.`
              : "Your fleet, at a glance."
            : status === "pending"
              ? "Your application is in review."
              : "Let's get you road-ready."
        }
        description={
          status === "approved"
            ? "Manage incoming requests, keep your fleet available and track your earnings in real time."
            : status === "pending"
              ? "Our team is verifying your vehicle and documents. You'll get an email as soon as there's an update."
              : "Complete partner onboarding to list your vehicle and start accepting rides."
        }
        actions={
          <>
            <button type="button" onClick={() => load()} disabled={refreshing} className="btn-outline">
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} /> Refresh
            </button>
            {status === "approved" ? (
              <Link href="/dashboard/partner/requests" className="btn-dark">
                <Sparkles className="h-4 w-4" /> View requests
              </Link>
            ) : (
              <Link href="/dashboard/partner/onboarding" className="btn-dark">
                <ShieldCheck className="h-4 w-4" /> {status === "pending" ? "View application" : "Continue onboarding"}
              </Link>
            )}
          </>
        }
      />

      {error && (
        <p className="rounded-2xl border border-danger/15 bg-danger/5 px-4 py-3 text-xs text-danger">{error}</p>
      )}

      {status !== "approved" && (
        <section
          className={cn(
            "relative overflow-hidden rounded-3xl border p-5 sm:p-6",
            status === "rejected" ? "border-danger/20 bg-danger/5" : "border-ink bg-ink text-white",
          )}
        >
          <div className="relative z-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "grid h-10 w-10 shrink-0 place-items-center rounded-full",
                  status === "rejected" ? "bg-danger/10 text-danger" : "bg-lime text-ink",
                )}
              >
                {status === "rejected" ? <ShieldAlert className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
              </span>
              <div>
                <p className={cn("text-sm font-bold", status === "rejected" ? "text-danger" : "text-white")}>
                  {status === "pending"
                    ? "Application submitted"
                    : status === "rejected"
                      ? "Action needed on your application"
                      : "You're not live yet"}
                </p>
                <p
                  className={cn(
                    "mt-1 max-w-xl text-[11px] leading-relaxed",
                    status === "rejected" ? "text-danger/70" : "text-fg-inverse-muted",
                  )}
                >
                  {status === "pending"
                    ? "You can review your submitted details while we verify them. Editing is paused until the review is complete."
                    : status === "rejected"
                      ? "Update the requested details and resubmit. Your application will return to the review queue."
                      : "Finish all six onboarding steps - vehicle, documents, bank, video KYC, pricing, then submit."}
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/partner/onboarding"
              className={cn("shrink-0", status === "rejected" ? "btn-dark" : "btn-light")}
            >
              {status === "pending" ? "Review application" : status === "rejected" ? "Fix application" : "Start onboarding"}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {status !== "rejected" && (
            <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-lime/10 blur-2xl" />
          )}
        </section>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Ride requests"
          value={loading ? "-" : stats?.pending || 0}
          hint="Waiting for your response"
          icon={Clock3}
          tone={stats?.pending ? "dark" : "light"}
          href={status === "approved" ? "/dashboard/partner/requests" : "/dashboard/partner/onboarding"}
        />
        <StatCard
          label="Active rides"
          value={loading ? "-" : stats?.active || 0}
          hint="Accepted, arrived or on trip"
          icon={MapPin}
          href={status === "approved" ? "/dashboard/partner/rides" : "/dashboard/partner/onboarding"}
        />
        <StatCard
          label="Net earnings"
          value={loading ? "-" : inr(stats?.net || 0)}
          hint={`${stats?.trips || 0} completed trips`}
          icon={Wallet}
          tone="lime"
          href={status === "approved" ? "/dashboard/partner/earnings" : "/dashboard/partner/onboarding"}
        />
        <StatCard
          label="Fleet"
          value={loading ? "-" : stats?.vehicles || 0}
          hint={
            stats?.rating
              ? `${stats.rating.toFixed(1)} average rating`
              : stats?.vehicles
                ? "Vehicles live on RYDEX"
                : "Add your first vehicle"
          }
          icon={Bike}
          href={status === "approved" ? "/dashboard/partner/fleet" : "/dashboard/partner/onboarding"}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="space-y-5">
          <section className="rounded-3xl border border-line bg-white p-5 sm:p-6">
            <SectionHeader
              title="Earnings pulse"
              description="Net partner earnings over the last six months"
              href={status === "approved" ? "/dashboard/partner/earnings" : undefined}
              linkLabel="Full report"
            />
            <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="font-display text-3xl font-extrabold tracking-tight">{inr(stats?.net || 0)}</p>
                <p className="mt-1 flex items-center gap-1.5 text-[10px] text-success">
                  <TrendingUp className="h-3 w-3" /> {inr(stats?.gross || 0)} gross · 10% platform fee
                </p>
              </div>
              <span className="rounded-full bg-surface-muted px-3 py-1.5 text-[10px] font-semibold text-fg-muted">
                {stats?.completed || 0} completed
              </span>
            </div>
            <MiniBarChart data={chart} format={(value) => inr(value, true)} className="mt-5" />
          </section>

          <section>
            <SectionHeader
              title="Recent rides"
              description="Your latest activity across the fleet"
              href={status === "approved" ? "/dashboard/partner/rides" : undefined}
            />
            <div className="mt-3 space-y-2.5">
              {loading &&
                Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="skeleton h-24 rounded-2xl bg-white" />
                ))}
              {!loading && (!data?.recent || data.recent.length === 0) && (
                <EmptyState
                  icon={Package}
                  title="No rides yet"
                  description={
                    status === "approved"
                      ? "New booking requests will appear here and in your requests queue."
                      : "Once your application is approved, riders can book your vehicle."
                  }
                  action={
                    status === "approved" ? (
                      <Link href="/dashboard/partner/fleet" className="btn-dark">Manage fleet</Link>
                    ) : (
                      <Link href="/dashboard/partner/onboarding" className="btn-dark">Continue onboarding</Link>
                    )
                  }
                />
              )}
              {!loading &&
                data?.recent?.map((ride) => (
                  <Link
                    key={ride._id}
                    href={`/bookings/${ride._id}`}
                    className="group flex flex-col gap-3 rounded-2xl border border-line bg-white p-3 transition hover:border-line-strong hover:shadow-sm sm:flex-row sm:items-center"
                  >
                    <div className="relative h-24 w-full shrink-0 overflow-hidden rounded-xl bg-surface-muted sm:h-16 sm:w-20">
                      {ride.vehicle?.image ? (
                        <Image src={ride.vehicle.image} alt="" fill sizes="80px" className="object-cover" />
                      ) : (
                        <div className="grid h-full place-items-center"><CarFront className="h-4 w-4 text-fg-subtle" /></div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={ride.status} dot={false} className="!px-2 !py-0.5 !text-[10px]" />
                        <span className="text-[10px] text-fg-subtle">{timeAgo(ride.createdAt)}</span>
                      </div>
                      <p className="mt-1.5 truncate text-xs font-bold">
                        {ride.user?.name || "RYDEX rider"} <span className="font-normal text-fg-subtle">·</span>{" "}
                        <span className="font-medium text-fg-muted">{ride.vehicle?.name || "Vehicle"}</span>
                      </p>
                      <p className="mt-1 truncate text-[10px] text-fg-muted">
                        {ride.pickup.address.split(",")[0]} → {ride.drop.address.split(",")[0]} · {ride.distanceKm} km
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center justify-between gap-4 border-t border-line pt-3 sm:block sm:border-0 sm:pt-0 sm:text-right">
                      <div>
                        <p className="text-[10px] text-fg-subtle">You earn</p>
                        <p className="text-sm font-extrabold">{inr(ride.fare.partnerEarning)}</p>
                      </div>
                      <p className="text-[10px] text-fg-subtle sm:mt-1">{formatDate(ride.date)} · {ride.time}</p>
                    </div>
                    <ChevronRight className="hidden h-4 w-4 text-fg-subtle transition group-hover:text-ink sm:block" />
                  </Link>
                ))}
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-3xl bg-ink p-5 text-white">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-lime">Today&apos;s queue</p>
              <CalendarCheck2 className="h-4 w-4 text-fg-inverse-subtle" />
            </div>
            <div className="mt-4 space-y-3">
              {status === "approved" ? (
                <>
                  <Link href="/dashboard/partner/requests" className="flex items-center justify-between rounded-2xl bg-surface/5 px-3.5 py-3 transition hover:bg-surface/10">
                    <div>
                      <p className="text-lg font-extrabold">{stats?.pending || 0}</p>
                      <p className="text-[10px] uppercase tracking-wider text-fg-inverse-subtle">New requests</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-lime" />
                  </Link>
                  <Link href="/dashboard/partner/rides" className="flex items-center justify-between rounded-2xl bg-surface/5 px-3.5 py-3 transition hover:bg-surface/10">
                    <div>
                      <p className="text-lg font-extrabold">{stats?.active || 0}</p>
                      <p className="text-[10px] uppercase tracking-wider text-fg-inverse-subtle">Active rides</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-lime" />
                  </Link>
                </>
              ) : (
                <div className="rounded-2xl bg-surface/5 px-3.5 py-3.5 text-[11px] leading-relaxed text-fg-inverse-muted">
                  Complete onboarding and get approved to unlock ride requests, live trip tools and earnings.
                </div>
              )}
            </div>
            <Link
              href={status === "approved" ? "/dashboard/partner/requests" : "/dashboard/partner/onboarding"}
              className="btn-lime mt-4 w-full"
            >
              {status === "approved" ? "Open request queue" : "Continue onboarding"}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </section>

          <section className="rounded-3xl border border-line bg-white p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold"><Star className="h-4 w-4 fill-ink" /> Partner score</div>
              <span className="text-xl font-extrabold">{stats?.rating ? stats.rating.toFixed(1) : "-"}</span>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-fg-muted">
              {stats?.ratingCount
                ? `Based on ${stats.ratingCount} rider rating${stats.ratingCount === 1 ? "" : "s"}.`
                : "Complete rides and collect ratings to build your score."}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-surface-muted/70 p-3">
                <p className="text-[10px] uppercase tracking-wider text-fg-subtle">Trips</p>
                <p className="mt-0.5 text-base font-extrabold">{stats?.trips || 0}</p>
              </div>
              <div className="rounded-2xl bg-surface-muted/70 p-3">
                <p className="text-[10px] uppercase tracking-wider text-fg-subtle">Avg / trip</p>
                <p className="mt-0.5 text-base font-extrabold">
                  {stats?.trips ? inr(stats.net / stats.trips) : inr(0)}
                </p>
              </div>
            </div>
          </section>

          {status === "approved" && (
            <section className="rounded-3xl border border-line bg-white p-5">
              <p className="eyebrow">Keep growing</p>
              <div className="mt-3 space-y-2">
                <Link href="/dashboard/partner/fleet" className="flex items-center gap-2.5 rounded-2xl border border-line p-3 text-xs font-semibold transition hover:border-line-strong hover:bg-surface-muted/40">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-surface-muted"><Plus className="h-3.5 w-3.5" /></span>
                  Add another vehicle
                  <ArrowRight className="ml-auto h-3.5 w-3.5 text-fg-subtle" />
                </Link>
                <Link href="/dashboard/partner/earnings" className="flex items-center gap-2.5 rounded-2xl border border-line p-3 text-xs font-semibold transition hover:border-line-strong hover:bg-surface-muted/40">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-surface-muted"><BadgeIndianRupee className="h-3.5 w-3.5" /></span>
                  Review payouts
                  <ArrowRight className="ml-auto h-3.5 w-3.5 text-fg-subtle" />
                </Link>
              </div>
            </section>
          )}

          <section className="rounded-3xl border border-line bg-white p-5">
            <div className="flex items-center gap-2 text-sm font-bold"><Gauge className="h-4 w-4" /> Partner standards</div>
            <div className="mt-3 space-y-2.5 text-[11px] leading-relaxed text-fg-muted">
              <p className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" /> Keep documents and insurance current.</p>
              <p className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" /> Never share pickup or drop OTPs in advance.</p>
              <p className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" /> Respond to new requests promptly.</p>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
