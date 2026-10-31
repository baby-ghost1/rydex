"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/ui";
import {
  ReviewQueueBanner,
  VendorAvatar,
  VendorStatusBadge,
} from "@/components/dashboard/admin-shared";
import { api } from "@/lib/client-api";
import { cn, formatDate, timeAgo } from "@rydex/shared/utils";
import type { PartnerStatus } from "@rydex/shared/types";

interface VendorRow {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  image?: string;
  partnerStatus: PartnerStatus;
  partnerProfile?: {
    businessName?: string;
    ownerName?: string;
    vehicleDraft?: {
      name?: string;
      category?: string;
      registrationNumber?: string;
      image?: string;
    };
    kyc?: { status?: string };
    submittedAt?: string;
    rejectionReason?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface VendorsResponse {
  vendors: VendorRow[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

interface OverviewCounts {
  totalVendors: number;
  approved: number;
  pending: number;
  rejected: number;
  drafts: number;
}

const statusTabs = [
  { key: "all", label: "All vendors" },
  { key: "pending", label: "In review" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Changes requested" },
  { key: "draft", label: "Drafts" },
];

const kycTone: Record<string, string> = {
  approved: "bg-success/10 text-success",
  pending: "bg-warning/10 text-warning",
  rejected: "bg-danger/10 text-danger",
  not_started: "bg-surface-muted text-fg-subtle",
};

export default function AdminVendors() {
  const [initialized, setInitialized] = useState(false);
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [data, setData] = useState<VendorsResponse | null>(null);
  const [counts, setCounts] = useState<OverviewCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlStatus = params.get("status");
    if (urlStatus && statusTabs.some((tab) => tab.key === urlStatus)) setStatus(urlStatus);
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
        const params = new URLSearchParams({ page: String(page), limit: "10" });
        if (status !== "all") params.set("status", status);
        if (debouncedQuery) params.set("q", debouncedQuery);
        const [vendorResult, statsResult] = await Promise.all([
          api<VendorsResponse>(`/api/admin/vendors?${params.toString()}`),
          api<{ stats: OverviewCounts }>("/api/admin/stats"),
        ]);
        if (cancelled) return;
        setData(vendorResult);
        setCounts(statsResult.stats);
        setError("");
        const next = new URLSearchParams();
        if (status !== "all") next.set("status", status);
        if (debouncedQuery) next.set("q", debouncedQuery);
        if (page > 1) next.set("page", String(page));
        window.history.replaceState(null, "", `${window.location.pathname}${next.size ? `?${next}` : ""}`);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load vendors.");
        }
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
  }, [initialized, status, debouncedQuery, page, refreshKey]);

  const pagination = data?.pagination;
  const vendors = data?.vendors || [];
  const approvedCount = counts?.approved || 0;
  const pendingCount = counts?.pending || 0;
  const rejectedCount = counts?.rejected || 0;
  const draftCount = counts?.drafts || 0;

  const tabCounts = useMemo(
    () => ({
      all: counts?.totalVendors || 0,
      pending: pendingCount,
      approved: approvedCount,
      rejected: rejectedCount,
      draft: draftCount,
    }),
    [counts, pendingCount, approvedCount, rejectedCount, draftCount],
  );

  function changeStatus(next: string) {
    setStatus(next);
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Vendor network"
        title="Partners, verified."
        description="Review applications, inspect compliance documents and keep every approved vendor accountable."
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
            <Link href="/dashboard/admin/bookings" className="btn-dark">
              All bookings <ArrowRight className="h-4 w-4" />
            </Link>
          </>
        }
      />

      {!loading && <ReviewQueueBanner pending={pendingCount} />}

      {error && <p className="rounded-2xl border border-danger/15 bg-danger/5 px-4 py-3 text-xs text-danger">{error}</p>}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: "Total vendors", value: counts?.totalVendors || 0, icon: Users, tone: "bg-white" },
          { label: "Approved", value: approvedCount, icon: ShieldCheck, tone: "bg-white" },
          { label: "In review", value: pendingCount, icon: Clock3, tone: "bg-lime" },
          { label: "Changes requested", value: rejectedCount, icon: ShieldAlert, tone: "bg-white" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className={cn("rounded-2xl border border-line p-4", item.tone)}>
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-fg-subtle">{item.label}</p>
                <Icon className="h-3.5 w-3.5 text-fg-subtle" />
              </div>
              <p className="font-display mt-2 text-xl font-extrabold tracking-tight sm:text-2xl">
                {loading ? "—" : item.value}
              </p>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="no-scrollbar flex gap-1 overflow-x-auto rounded-full border border-line bg-white p-1.5">
          {statusTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => changeStatus(tab.key)}
              className={cn(
                "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold transition",
                status === tab.key ? "bg-ink text-white" : "text-fg-muted hover:bg-surface-muted hover:text-ink",
              )}
            >
              {tab.label}
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px]",
                  status === tab.key ? "bg-lime text-ink" : "bg-surface-muted text-fg-muted",
                )}
              >
                {tabCounts[tab.key as keyof typeof tabCounts]}
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
            placeholder="Search business, owner, email or phone"
            aria-label="Search vendors"
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
          Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="skeleton h-24 rounded-2xl bg-white" />
          ))}

        {!loading &&
          vendors.map((vendor) => {
            const profile = vendor.partnerProfile || {};
            const kycStatus = profile.kyc?.status || "not_started";
            return (
              <Link
                key={vendor._id}
                href={`/dashboard/admin/vendors/${vendor._id}`}
                className="group grid gap-3 rounded-2xl border border-line bg-white p-4 transition hover:border-line-strong hover:shadow-sm sm:grid-cols-[auto_1fr_auto] sm:items-center sm:gap-4"
              >
                <VendorAvatar name={vendor.name} image={vendor.image} />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-sm font-bold">
                      {profile.businessName || vendor.name}
                    </h2>
                    <VendorStatusBadge
                      status={vendor.partnerStatus}
                      dot={false}
                      className="!px-2 !py-0.5 !text-[10px]"
                    />
                    {vendor.partnerStatus === "draft" && (
                      <span className="text-[10px] font-semibold text-fg-subtle">Onboarding incomplete</span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-[10px] text-fg-muted">
                    {profile.ownerName || vendor.name} · {vendor.email}
                    {vendor.phone ? ` · ${vendor.phone}` : ""}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-fg-subtle">
                    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold", kycTone[kycStatus] || kycTone.not_started)}>
                      <FileCheck2 className="h-2.5 w-2.5" /> KYC {kycStatus.replace("_", " ")}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-2.5 w-2.5" />
                      {profile.vehicleDraft?.name || "No vehicle draft"}
                      {profile.vehicleDraft?.registrationNumber ? ` · ${profile.vehicleDraft.registrationNumber}` : ""}
                    </span>
                    {profile.submittedAt ? (
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle2 className="h-2.5 w-2.5" /> Submitted {formatDate(profile.submittedAt)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <Clock3 className="h-2.5 w-2.5" /> Updated {timeAgo(vendor.updatedAt)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4 border-t border-line pt-3 sm:block sm:border-0 sm:pt-0 sm:text-right">
                  <div>
                    <p className="text-[10px] text-fg-subtle">Joined</p>
                    <p className="text-[11px] font-semibold">{formatDate(vendor.createdAt)}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-fg-muted group-hover:text-ink sm:mt-2">
                    Review <ArrowUpRight className="h-3 w-3" />
                  </span>
                </div>
              </Link>
            );
          })}
      </div>

      {!loading && vendors.length === 0 && (
        <div className="rounded-3xl border border-dashed border-line bg-surface/60 px-6 py-20 text-center">
          <Users className="mx-auto h-6 w-6 text-fg-subtle" />
          <p className="font-display mt-3 text-xl font-bold">
            {query || status !== "all" ? "No matching vendors" : "No vendors yet"}
          </p>
          <p className="mt-1 text-xs text-fg-muted">
            {query
              ? "Try a different business name, owner, email or phone."
              : status !== "all"
                ? "There are no vendors in this stage right now."
                : "Partner applications will appear here as riders onboard."}
          </p>
          {(query || status !== "all") && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                changeStatus("all");
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
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} vendors
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
