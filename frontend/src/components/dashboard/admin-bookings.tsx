"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Loader2,
  PackageOpen,
  RefreshCw,
  Route as RouteIcon,
  Search,
  ShieldCheck,
  Wallet,
  X,
} from "lucide-react";
import { PageHeader, StatCard } from "@/components/dashboard/ui";
import { VendorAvatar } from "@/components/dashboard/admin-shared";
import StatusBadge from "@/components/status-badge";
import { api } from "@/lib/client-api";
import { cn, formatDate, inr, timeAgo } from "@rydex/shared/utils";

interface AdminBooking {
  _id: string;
  status: string;
  paymentMethod: "cash" | "online";
  paymentStatus: string;
  date: string;
  time: string;
  distanceKm: number;
  durationMin: number;
  createdAt: string;
  fare: { total: number; platformFee: number; partnerEarning: number };
  pickup: { address: string };
  drop: { address: string };
  vehicle?: { name: string; image?: string; category?: string; registrationNumber?: string } | null;
  user?: { name?: string; email?: string; phone?: string; image?: string } | null;
  partner?: { name?: string; email?: string; phone?: string; image?: string; partnerProfile?: { businessName?: string } } | null;
}

interface BookingsResponse {
  bookings: AdminBooking[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

interface AdminStats {
  bookings: number;
  completedTrips: number;
  grossRevenue: number;
  platformRevenue: number;
  partnerPayouts: number;
  users: number;
}

const tabs = [
  { key: "all", label: "All bookings", statuses: "" },
  { key: "active", label: "Active", statuses: "accepted,arrived,started" },
  { key: "pending", label: "Pending", statuses: "pending" },
  { key: "completed", label: "Completed", statuses: "completed" },
  { key: "closed", label: "Cancelled", statuses: "cancelled,rejected" },
];

export default function AdminBookings() {
  const [initialized, setInitialized] = useState(false);
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [data, setData] = useState<BookingsResponse | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [bookingCounts, setBookingCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlStatus = params.get("status");
    if (urlStatus && tabs.some((item) => item.key === urlStatus || item.statuses === urlStatus)) {
      setTab(urlStatus);
    }
    const urlQuery = params.get("q");
    if (urlQuery) {
      setQuery(urlQuery);
      setDebouncedQuery(urlQuery);
    }
    setInitialized(true);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!initialized) return;
    let cancelled = false;
    async function load(silent = false) {
      if (!silent) setRefreshing(true);
      try {
        const activeTab = tabs.find((item) => item.key === tab) || tabs[0];
        const params = new URLSearchParams({ page: String(page), limit: "15", as: "admin" });
        if (activeTab.statuses) params.set("status", activeTab.statuses);
        if (debouncedQuery) params.set("q", debouncedQuery);
        const [bookingResult, statsResult] = await Promise.all([
          api<BookingsResponse>(`/api/bookings?${params.toString()}`),
          api<{ stats: AdminStats; bookingByStatus: Record<string, number> }>("/api/admin/stats"),
        ]);
        if (cancelled) return;
        setData(bookingResult);
        setStats(statsResult.stats);
        setBookingCounts(statsResult.bookingByStatus || {});
        setError("");
        const next = new URLSearchParams();
        if (tab !== "all") next.set("status", tab);
        if (debouncedQuery) next.set("q", debouncedQuery);
        if (page > 1) next.set("page", String(page));
        window.history.replaceState(null, "", `${window.location.pathname}${next.size ? `?${next}` : ""}`);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load bookings.");
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }
    load(Boolean(data));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized, tab, debouncedQuery, page, refreshKey]);

  const tabCounts = useMemo(
    () => ({
      all: Object.values(bookingCounts).reduce((sum, value) => sum + value, 0),
      active: (bookingCounts.accepted || 0) + (bookingCounts.arrived || 0) + (bookingCounts.started || 0),
      pending: bookingCounts.pending || 0,
      completed: bookingCounts.completed || 0,
      closed: (bookingCounts.cancelled || 0) + (bookingCounts.rejected || 0),
    }),
    [bookingCounts],
  );

  const bookings = data?.bookings || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="All bookings"
        title="Every ride on RYDEX."
        description="Monitor requests, live trips and completed rides across every partner and rider."
        actions={
          <>
            <button
              type="button"
              onClick={() => {
                setPage(1);
                setRefreshKey((value) => value + 1);
              }}
              disabled={refreshing}
              className="btn-outline"
            >
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Refresh
            </button>
            <Link href="/dashboard/admin/vendors" className="btn-dark">
              <ShieldCheck className="h-4 w-4" /> Vendors
            </Link>
          </>
        }
      />

      {error && <p className="rounded-2xl border border-danger/15 bg-danger/5 px-4 py-3 text-xs text-danger">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total bookings"
          value={loading ? "—" : stats?.bookings || 0}
          hint={`${stats?.completedTrips || 0} completed trips`}
          icon={CalendarDays}
        />
        <StatCard
          label="Completed"
          value={loading ? "—" : stats?.completedTrips || 0}
          hint={`${tabCounts.active} active now`}
          icon={CheckCircle2}
          tone="dark"
        />
        <StatCard
          label="Gross fare value"
          value={loading ? "—" : inr(stats?.grossRevenue || 0)}
          hint={`${stats?.users || 0} registered accounts`}
          icon={Wallet}
        />
        <StatCard
          label="Platform revenue"
          value={loading ? "—" : inr(stats?.platformRevenue || 0)}
          hint={`${inr(stats?.partnerPayouts || 0)} partner payouts`}
          icon={CreditCard}
          tone="lime"
        />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="no-scrollbar flex gap-1 overflow-x-auto rounded-full border border-line bg-white p-1.5">
          {tabs.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                setTab(item.key);
                setPage(1);
              }}
              className={cn(
                "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold transition",
                tab === item.key ? "bg-ink text-white" : "text-fg-muted hover:bg-surface-muted hover:text-ink",
              )}
            >
              {item.label}
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px]",
                  tab === item.key ? "bg-lime text-ink" : "bg-surface-muted text-fg-muted",
                )}
              >
                {tabCounts[item.key as keyof typeof tabCounts]}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full lg:max-w-sm">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-subtle" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="input !rounded-full !py-2.5 pl-9 pr-12 text-xs"
            placeholder="Search route, date or booking ID"
            aria-label="Search bookings"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-1 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full text-fg-subtle transition hover:bg-surface-muted hover:text-ink"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2.5">
        {loading &&
          Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="skeleton h-32 rounded-2xl bg-white" />
          ))}

        {!loading &&
          bookings.map((booking) => (
            <Link
              key={booking._id}
              href={`/bookings/${booking._id}`}
              className="group block rounded-2xl border border-line bg-white p-4 transition hover:border-line-strong hover:shadow-sm"
            >
              <div className="flex flex-wrap items-center gap-2 border-b border-line pb-3">
                <StatusBadge status={booking.status} dot={false} className="!px-2 !py-0.5 !text-[10px]" />
                <span className="text-[10px] font-semibold text-fg-muted">
                  #{booking._id.slice(-8).toUpperCase()}
                </span>
                <span className="text-[10px] text-fg-subtle">{timeAgo(booking.createdAt)}</span>
                <span
                  className={cn(
                    "ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                    booking.paymentMethod === "cash"
                      ? "bg-surface-muted text-fg-muted"
                      : booking.paymentStatus === "paid"
                        ? "bg-success/10 text-success"
                        : booking.paymentStatus === "refunded"
                          ? "bg-warning/10 text-warning"
                          : "bg-warning/10 text-warning",
                  )}
                >
                  {booking.paymentMethod === "cash" ? "Cash" : `Online · ${booking.paymentStatus}`}
                </span>
              </div>

              <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_1fr_auto] lg:items-center">
                <div className="flex min-w-0 items-center gap-2.5">
                  <VendorAvatar name={booking.user?.name} image={booking.user?.image} size="sm" />
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-fg-subtle">Rider</p>
                    <p className="truncate text-xs font-bold">{booking.user?.name || "RYDEX rider"}</p>
                    <p className="truncate text-[10px] text-fg-muted">{booking.user?.email || booking.user?.phone || "—"}</p>
                  </div>
                </div>

                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-lime text-[10px] font-bold text-ink">
                    {(booking.partner?.partnerProfile?.businessName || booking.partner?.name || "RYDEX")
                      .split(" ")
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((part) => part[0]?.toUpperCase())
                      .join("")}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-fg-subtle">Partner</p>
                    <p className="truncate text-xs font-bold">
                      {booking.partner?.partnerProfile?.businessName || booking.partner?.name || "Unassigned"}
                    </p>
                    <p className="truncate text-[10px] text-fg-muted">{booking.vehicle?.name || "Vehicle"}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 border-t border-line pt-3 lg:border-0 lg:pt-0 lg:text-right">
                  <div>
                    <p className="text-[10px] text-fg-subtle">Total fare</p>
                    <p className="text-sm font-extrabold">{inr(booking.fare.total)}</p>
                    <p className="text-[10px] text-success">Fee {inr(booking.fare.platformFee)}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-fg-muted group-hover:text-ink">
                    Details <ArrowUpRight className="h-3 w-3" />
                  </span>
                </div>
              </div>

              <div className="mt-3 flex flex-col gap-2 rounded-xl bg-surface-muted/50 px-3 py-2.5 sm:flex-row sm:items-center sm:gap-4">
                <div className="flex min-w-0 flex-1 items-center gap-2 text-[10px]">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ink" />
                  <span className="truncate text-fg-muted">{booking.pickup.address}</span>
                </div>
                <div className="flex min-w-0 flex-1 items-center gap-2 text-[10px]">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-lime ring-1 ring-ink/20" />
                  <span className="truncate text-fg-muted">{booking.drop.address}</span>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-[10px] text-fg-muted">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-2.5 w-2.5" /> {formatDate(booking.date)} · {booking.time}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <RouteIcon className="h-2.5 w-2.5" /> {booking.distanceKm} km
                  </span>
                </div>
              </div>
            </Link>
          ))}
      </div>

      {!loading && bookings.length === 0 && (
        <div className="rounded-3xl border border-dashed border-line bg-surface/60 px-6 py-20 text-center">
          <PackageOpen className="mx-auto h-6 w-6 text-fg-subtle" />
          <p className="font-display mt-3 text-xl font-bold">
            {query || tab !== "all" ? "No matching bookings" : "No bookings yet"}
          </p>
          <p className="mt-1 text-xs text-fg-muted">
            {query
              ? "Try a different route, date or booking ID."
              : tab !== "all"
                ? "There are no bookings in this state right now."
                : "As riders book vehicles, every ride will appear here."}
          </p>
          {(query || tab !== "all") && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setTab("all");
                setPage(1);
              }}
              className="btn-outline mt-5"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {pagination && pagination.pages > 1 && (
        <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-line bg-white px-4 py-3 sm:flex-row">
          <p className="text-[10px] text-fg-muted">
            Showing {(pagination.page - 1) * pagination.limit + 1}–
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} bookings
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={pagination.page <= 1 || refreshing}
              className="inline-flex min-h-11 items-center gap-1 rounded-full border border-line px-3.5 text-xs font-semibold transition hover:border-line-strong disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowLeft className="h-3 w-3" /> Previous
            </button>
            <span className="text-[10px] font-semibold text-fg-muted">
              {pagination.page} / {pagination.pages}
            </span>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(pagination.pages, current + 1))}
              disabled={pagination.page >= pagination.pages || refreshing}
              className="inline-flex min-h-11 items-center gap-1 rounded-full border border-line px-3.5 text-xs font-semibold transition hover:border-line-strong disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
