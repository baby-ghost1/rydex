"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeIndianRupee,
  Bike,
  CalendarCheck2,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Loader2,
  Navigation,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { PageHeader, SectionHeader, StatCard } from "@/components/dashboard/ui";
import { MiniBarChart, ProgressRow } from "@/components/dashboard/mini-charts";
import {
  ReviewQueueBanner,
  VendorAvatar,
  VendorStatusBadge,
} from "@/components/dashboard/admin-shared";
import StatusBadge from "@/components/status-badge";
import { api } from "@/lib/client-api";
import { cn, formatDate, inr, resolveBookingCode, timeAgo } from "@rydex/shared/utils";
import type { PartnerStatus } from "@rydex/shared/types";

interface AdminStats {
  totalVendors: number;
  approved: number;
  pending: number;
  rejected: number;
  drafts: number;
  users: number;
  activeVehicles: number;
  bookings: number;
  completedTrips: number;
  grossRevenue: number;
  platformRevenue: number;
  partnerPayouts: number;
}

interface StatsResponse {
  stats: AdminStats;
  bookingByStatus: Record<string, number>;
  recent: VendorLite[];
  monthlyVendors: Array<{ _id: { y: number; m: number }; count: number }>;
}

interface VendorLite {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  image?: string;
  partnerStatus: PartnerStatus;
  partnerProfile?: {
    businessName?: string;
    ownerName?: string;
    vehicleDraft?: { name?: string; registrationNumber?: string; category?: string };
    kyc?: { status?: string };
    submittedAt?: string;
    rejectionReason?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface BookingLite {
  _id: string;
  bookingCode?: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  date: string;
  time: string;
  distanceKm: number;
  createdAt: string;
  fare: { total: number; platformFee: number };
  pickup: { address: string };
  drop: { address: string };
  vehicle?: { name?: string } | null;
  user?: { name?: string } | null;
  partner?: { name?: string; partnerProfile?: { businessName?: string } } | null;
}

const statusOrder = ["pending", "accepted", "arrived", "started", "completed", "cancelled", "rejected"];

export default function AdminOverview() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [pendingVendors, setPendingVendors] = useState<VendorLite[]>([]);
  const [recentBookings, setRecentBookings] = useState<BookingLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function load(silent = false) {
    if (!silent) setRefreshing(true);
    try {
      const [statsResult, pendingResult, bookingsResult] = await Promise.all([
        api<StatsResponse>("/api/admin/stats"),
        api<{ vendors: VendorLite[] }>("/api/admin/vendors?status=pending&limit=5"),
        api<{ bookings: BookingLite[] }>("/api/bookings?as=admin&limit=5"),
      ]);
      setStats(statsResult);
      setPendingVendors(pendingResult.vendors || []);
      setRecentBookings(bookingsResult.bookings || []);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the admin overview.");
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

  const summary = stats?.stats;
  const bookingCounts = stats?.bookingByStatus || {};
  const bookingTotal = Object.values(bookingCounts).reduce((sum, value) => sum + value, 0);
  const vendorChart = useMemo(
    () =>
      (stats?.monthlyVendors || []).map((row) => ({
        label: `${new Date(row._id.y, row._id.m - 1).toLocaleString("en-IN", { month: "short" })} ${String(row._id.y).slice(2)}`,
        value: row.count,
        hint: "partner signups",
      })),
    [stats?.monthlyVendors],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin console"
        title="Marketplace pulse."
        description="Review partner applications, monitor every booking and keep the RYDEX marketplace healthy."
        actions={
          <>
            <button type="button" onClick={() => load()} disabled={refreshing} className="btn-outline">
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} /> Refresh
            </button>
            <Link href="/dashboard/admin/vendors" className="btn-dark">
              <ShieldCheck className="h-4 w-4" /> Vendors
            </Link>
          </>
        }
      />

      {error && (
        <p className="rounded-2xl border border-danger/15 bg-danger/5 px-4 py-3 text-xs text-danger">{error}</p>
      )}

      {!loading && <ReviewQueueBanner pending={summary?.pending || 0} />}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Platform revenue"
          value={loading ? "-" : inr(summary?.platformRevenue || 0)}
          hint="10% of completed fares"
          icon={BadgeIndianRupee}
          tone="lime"
        />
        <StatCard
          label="Gross bookings"
          value={loading ? "-" : inr(summary?.grossRevenue || 0)}
          hint={`${summary?.partnerPayouts ? inr(summary.partnerPayouts) : inr(0)} paid to partners`}
          icon={Wallet}
        />
        <StatCard
          label="Active vendors"
          value={loading ? "-" : summary?.approved || 0}
          hint={`${summary?.pending || 0} awaiting review`}
          icon={Users}
          href="/dashboard/admin/vendors?status=approved"
        />
        <StatCard
          label="Live vehicles"
          value={loading ? "-" : summary?.activeVehicles || 0}
          hint={`${summary?.bookings || 0} bookings all time`}
          icon={Bike}
          tone="dark"
          href="/dashboard/admin/bookings"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="space-y-5">
          <section className="rounded-3xl border border-line bg-white p-5 sm:p-6">
            <SectionHeader
              title="Booking activity"
              description="Every ride on the platform, by current state"
              href="/dashboard/admin/bookings"
              linkLabel="All bookings"
            />
            <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="font-display text-3xl font-extrabold tracking-tight">{summary?.bookings || 0}</p>
                <p className="mt-1 flex items-center gap-1.5 text-[10px] text-success">
                  <TrendingUp className="h-3 w-3" /> {summary?.completedTrips || 0} trips completed
                </p>
              </div>
              <span className="rounded-full bg-surface-muted px-3 py-1.5 text-[10px] font-semibold text-fg-muted">
                {bookingTotal} recorded
              </span>
            </div>
            <div className="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2">
              {statusOrder.map((status) => (
                <ProgressRow
                  key={status}
                  label={status === "arrived" ? "partner arrived" : status}
                  value={bookingCounts[status] || 0}
                  max={Math.max(1, bookingTotal)}
                  format={(value) => String(value)}
                  tone={status === "completed" ? "success" : status === "cancelled" ? "dark" : "lime"}
                />
              ))}
            </div>
          </section>

          <section>
            <SectionHeader
              title="Latest bookings"
              description="The five newest ride requests across all partners"
              href="/dashboard/admin/bookings"
            />
            <div className="mt-3 overflow-hidden rounded-2xl border border-line bg-white">
              {loading && (
                <div className="space-y-2 p-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="skeleton h-16 rounded-xl" />
                  ))}
                </div>
              )}
              {!loading && recentBookings.length === 0 && (
                <div className="px-5 py-12 text-center">
                  <ClipboardList className="mx-auto h-5 w-5 text-fg-subtle" />
                  <p className="mt-2 text-xs font-semibold">No bookings yet</p>
                  <p className="mt-0.5 text-[10px] text-fg-muted">New ride requests will show up here.</p>
                </div>
              )}
              {!loading &&
                recentBookings.map((booking) => (
                  <Link
                    key={booking._id}
                    href={`/bookings/${booking._id}`}
                    className="group flex flex-col gap-2 border-b border-line px-4 py-3 transition last:border-0 hover:bg-surface-muted/40 sm:flex-row sm:items-center sm:gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={booking.status} dot={false} className="!px-2 !py-0.5 !text-[10px]" />
                        <span className="text-[10px] text-fg-subtle">{resolveBookingCode(booking)}</span>
                        <span className="text-[10px] text-fg-subtle">{timeAgo(booking.createdAt)}</span>
                      </div>
                      <p className="mt-1 truncate text-xs font-semibold">
                        {booking.user?.name || "Rider"}{" "}
                        <span className="font-normal text-fg-subtle">·</span>{" "}
                        <span className="font-medium text-fg-muted">{booking.vehicle?.name || "Vehicle"}</span>
                      </p>
                      <p className="mt-0.5 truncate text-[10px] text-fg-muted">
                        <Navigation className="mr-1 inline-block h-2.5 w-2.5 align-middle" aria-hidden="true" />
                        {booking.pickup.address.split(",")[0]} → {booking.drop.address.split(",")[0]}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-4 sm:block sm:text-right">
                      <div>
                        <p className="text-[10px] text-fg-subtle">Total fare</p>
                        <p className="text-xs font-extrabold">{inr(booking.fare.total)}</p>
                      </div>
                      <p className="text-[10px] text-fg-subtle sm:mt-0.5">
                        {formatDate(booking.date)} · {booking.time}
                      </p>
                    </div>
                    <ArrowUpRight className="hidden h-3.5 w-3.5 text-fg-subtle group-hover:text-ink sm:block" />
                  </Link>
                ))}
            </div>
          </section>

          <section className="rounded-3xl border border-line bg-white p-5 sm:p-6">
            <SectionHeader
              title="Partner signups"
              description="New vendor accounts over the last six months"
              href="/dashboard/admin/vendors"
              linkLabel="All vendors"
            />
            {vendorChart.length ? (
              <MiniBarChart data={vendorChart} format={(value) => String(value)} className="mt-5" />
            ) : (
              <div className="mt-4 grid h-40 place-items-center rounded-2xl bg-surface-muted/50 text-[11px] text-fg-subtle">
                Vendor signup history will appear here.
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-3xl bg-ink p-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-lime">Review queue</p>
                <p className="font-display mt-1 text-3xl font-extrabold">{summary?.pending || 0}</p>
              </div>
              <span className="grid h-10 w-10 place-items-center rounded-full bg-surface/10 text-lime">
                <Clock3 className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-fg-inverse-subtle">
              Applications need document and video KYC checks before they can go live.
            </p>
            <Link href="/dashboard/admin/vendors?status=pending" className="btn-lime mt-4 w-full">
              Open review queue <ArrowRight className="h-4 w-4" />
            </Link>
          </section>

          <section className="overflow-hidden rounded-3xl border border-line bg-white">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div>
                <h2 className="font-display text-base font-bold tracking-tight">Awaiting review</h2>
                <p className="mt-0.5 text-[10px] text-fg-muted">Oldest applications first</p>
              </div>
              <Link href="/dashboard/admin/vendors?status=pending" className="text-[10px] font-semibold text-fg-muted hover:text-ink">
                View all
              </Link>
            </div>
            {loading && (
              <div className="space-y-2 p-4">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="skeleton h-14 rounded-xl" />
                ))}
              </div>
            )}
            {!loading && pendingVendors.length === 0 && (
              <div className="px-5 py-10 text-center">
                <CheckCircle2 className="mx-auto h-5 w-5 text-success" />
                <p className="mt-2 text-xs font-semibold">Queue clear</p>
                <p className="mt-0.5 text-[10px] text-fg-muted">No applications are waiting right now.</p>
              </div>
            )}
            {!loading &&
              pendingVendors.map((vendor) => (
                <Link
                  key={vendor._id}
                  href={`/dashboard/admin/vendors/${vendor._id}`}
                  className="group flex items-center gap-3 border-b border-line px-4 py-3 transition last:border-0 hover:bg-surface-muted/40"
                >
                  <VendorAvatar name={vendor.name} image={vendor.image} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold">
                      {vendor.partnerProfile?.businessName || vendor.name}
                    </p>
                    <p className="truncate text-[10px] text-fg-muted">
                      {vendor.partnerProfile?.vehicleDraft?.name || "Vehicle pending"} ·{" "}
                      {vendor.partnerProfile?.submittedAt
                        ? `submitted ${timeAgo(vendor.partnerProfile.submittedAt)}`
                        : "not submitted"}
                    </p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-fg-subtle group-hover:text-ink" />
                </Link>
              ))}
          </section>

          <section className="overflow-hidden rounded-3xl border border-line bg-white">
            <div className="border-b border-line px-5 py-4">
              <h2 className="font-display text-base font-bold tracking-tight">Recent applications</h2>
              <p className="mt-0.5 text-[10px] text-fg-muted">Latest vendor activity</p>
            </div>
            {loading && (
              <div className="space-y-2 p-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="skeleton h-12 rounded-xl" />
                ))}
              </div>
            )}
            {!loading &&
              (stats?.recent || []).map((vendor) => (
                <Link
                  key={vendor._id}
                  href={`/dashboard/admin/vendors/${vendor._id}`}
                  className="flex items-center gap-2.5 border-b border-line px-4 py-2.5 transition last:border-0 hover:bg-surface-muted/40"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-semibold">
                      {vendor.partnerProfile?.businessName || vendor.name}
                    </p>
                    <p className="truncate text-[10px] text-fg-subtle">{vendor.email}</p>
                  </div>
                  <VendorStatusBadge status={vendor.partnerStatus} dot={false} className="!px-2 !py-0.5 !text-[10px]" />
                </Link>
              ))}
          </section>

          <section className="rounded-3xl border border-line bg-white p-5">
            <div className="flex items-center gap-2 text-sm font-bold">
              <CalendarCheck2 className="h-4 w-4" /> Platform totals
            </div>
            <div className="mt-3 space-y-2.5 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-fg-muted">Registered accounts</span>
                <span className="font-semibold">{summary?.users || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-fg-muted">Total vendors</span>
                <span className="font-semibold">{summary?.totalVendors || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-fg-muted">Approved</span>
                <span className="font-semibold text-success">{summary?.approved || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-fg-muted">Changes requested</span>
                <span className="font-semibold text-danger">{summary?.rejected || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-fg-muted">Unfinished drafts</span>
                <span className="font-semibold">{summary?.drafts || 0}</span>
              </div>
              <div className="flex items-center justify-between border-t border-line pt-2.5">
                <span className="text-fg-muted">Partner payouts</span>
                <span className="font-semibold">{inr(summary?.partnerPayouts || 0)}</span>
              </div>
            </div>
          </section>
        </aside>
      </div>

      {refreshing && (
        <span className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-[10px] font-semibold text-white shadow-xl">
          <Loader2 className="mr-1.5 inline h-3 w-3 animate-spin text-lime" /> Refreshing dashboard
        </span>
      )}
    </div>
  );
}
