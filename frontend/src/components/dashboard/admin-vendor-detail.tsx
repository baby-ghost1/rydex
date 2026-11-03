"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Bike,
  Check,
  Clock3,
  ExternalLink,
  FileCheck2,
  FileText,
  Landmark,
  Loader2,
  LockKeyhole,
  Mail,
  Phone,
  PlayCircle,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Star,
  UserRound,
  Video,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/dashboard/ui";
import { VendorAvatar, VendorStatusBadge } from "@/components/dashboard/admin-shared";
import ZegoKycRoom from "@/components/dashboard/zego-kyc-room";
import Modal from "@/components/ui/modal";
import { api } from "@/lib/client-api";
import { CATEGORY_MAP } from "@rydex/shared/constants";
import { cn, formatDate, inr } from "@rydex/shared/utils";
import type { PartnerStatus, VehicleCategory } from "@rydex/shared/types";

interface VendorProfile {
  businessName: string;
  ownerName: string;
  vehicleDraft: {
    category?: VehicleCategory;
    name?: string;
    brand?: string;
    model?: string;
    year?: number;
    registrationNumber?: string;
    image?: string;
    seats?: number;
    transmission?: string;
    fuel?: string;
    description?: string;
  };
  documents: {
    drivingLicense?: string;
    vehicleRc?: string;
    insurance?: string;
    permit?: string;
  };
  bank: {
    accountHolder: string;
    accountNumberLast4: string;
    ifsc: string;
    bankName: string;
    upiId?: string;
  };
  kyc: {
    status?: "not_started" | "pending" | "approved" | "rejected";
    videoUrl?: string;
    roomId?: string;
    note?: string;
    submittedAt?: string;
    reviewedAt?: string;
  };
  pricing: {
    perKm?: number;
    baseFare?: number;
    perHour?: number;
    minimumFare?: number;
    waitingCharge?: number;
  };
  submittedAt?: string;
  reviewedAt?: string;
  rejectionReason: string;
}

interface VendorVehicle {
  _id: string;
  name: string;
  image: string;
  category: VehicleCategory;
  registrationNumber: string;
  brand: string;
  model: string;
  year: number;
  baseFare: number;
  pricePerKm: number;
  available: boolean;
  approved: boolean;
  totalTrips: number;
  rating: number;
}

interface VendorDetail {
  id: string;
  name: string;
  email: string;
  phone?: string;
  image?: string;
  role: string;
  partnerStatus: PartnerStatus;
  createdAt: string;
  profile: VendorProfile;
}

interface DetailResponse {
  vendor: VendorDetail;
  vehicles: VendorVehicle[];
  metrics: { bookings: number; trips: number; netEarnings: number };
}

const docLabels: Array<{ key: keyof VendorProfile["documents"]; label: string; required: boolean }> = [
  { key: "drivingLicense", label: "Driving licence", required: true },
  { key: "vehicleRc", label: "Vehicle RC", required: true },
  { key: "insurance", label: "Vehicle insurance", required: true },
  { key: "permit", label: "Commercial permit", required: false },
];

const kycTone: Record<string, string> = {
  approved: "bg-success/10 text-success",
  pending: "bg-warning/10 text-warning",
  rejected: "bg-danger/10 text-danger",
  not_started: "bg-surface-muted text-fg-muted",
};

function isImageDoc(url: string) {
  return /\.(png|jpe?g|webp|avif|gif)(\?.*)?$/i.test(url);
}

function isVideoDoc(url: string) {
  return /\.(mp4|webm|mov)(\?.*)?$/i.test(url);
}

export default function AdminVendorDetail({ vendorId }: { vendorId: string }) {
  const [data, setData] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const [reason, setReason] = useState("");
  const [resetKyc, setResetKyc] = useState(false);
  const [saving, setSaving] = useState(false);
  const [zegoEnabled, setZegoEnabled] = useState(false);
  const [kycRoomOpen, setKycRoomOpen] = useState(false);

  async function load(silent = false) {
    if (!silent) setRefreshing(true);
    try {
      const result = await api<DetailResponse>(`/api/admin/vendors/${vendorId}`);
      setData(result);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load this vendor.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
    fetch("/api/config")
      .then((response) => (response.ok ? response.json() : null))
      .then((config) => setZegoEnabled(Boolean(config?.zegoEnabled)))
      .catch(() => {});
  }, [vendorId]); // eslint-disable-line react-hooks/exhaustive-deps

  const vendor = data?.vendor;
  const profile = vendor?.profile;
  const submitted = Boolean(profile?.submittedAt);
  const checklist = useMemo(() => {
    if (!profile) return [];
    const draft = profile.vehicleDraft || {};
    return [
      {
        label: "Business & vehicle details",
        done: Boolean(profile.businessName && profile.ownerName && draft.registrationNumber && draft.image),
      },
      {
        label: "Required documents uploaded",
        done: Boolean(profile.documents?.drivingLicense && profile.documents?.vehicleRc && profile.documents?.insurance),
      },
      {
        label: "Payout account added",
        done: Boolean(profile.bank?.accountHolder && profile.bank?.accountNumberLast4 && profile.bank?.ifsc),
      },
      {
        label: "Video KYC submitted",
        done: ["pending", "approved"].includes(profile.kyc?.status || ""),
      },
      {
        label: "Pricing configured",
        done: Boolean(profile.pricing?.perKm) && profile.pricing?.baseFare !== undefined,
      },
    ];
  }, [profile]);

  async function submitReview() {
    if (!action) return;
    if (action === "reject" && !reason.trim()) {
      toast.error("Add a reason so the partner knows what to fix.");
      return;
    }
    setSaving(true);
    try {
      await api(`/api/admin/vendors/${vendorId}`, {
        method: "PATCH",
        json: {
          action,
          reason: action === "reject" ? reason.trim() : undefined,
          resetKyc: action === "reject" ? resetKyc : undefined,
        },
      });
      toast.success(action === "approve" ? "Vendor approved and vehicles are live" : "Application sent back for changes");
      setAction(null);
      setReason("");
      setResetKyc(false);
      await load(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not complete the review.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="skeleton h-24 rounded-2xl" />
        <div className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
          <div className="space-y-4">
            <div className="skeleton h-64 rounded-3xl" />
            <div className="skeleton h-80 rounded-3xl" />
          </div>
          <div className="space-y-4">
            <div className="skeleton h-56 rounded-3xl" />
            <div className="skeleton h-64 rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!vendor || !profile) {
    return (
      <div className="rounded-3xl border border-danger/15 bg-danger/5 p-8 text-center">
        <AlertTriangle className="mx-auto h-6 w-6 text-danger" />
        <p className="font-display mt-3 text-xl font-bold">Vendor not found</p>
        <p className="mt-1 text-sm text-fg-muted">{error || "This partner may have been removed."}</p>
        <Link href="/dashboard/admin/vendors" className="btn-dark mt-5">
          Back to vendors
        </Link>
      </div>
    );
  }

  const draft = profile.vehicleDraft || {};
  const kyc = profile.kyc || {};
  const kycStatus = kyc.status || "not_started";
  const checklistComplete = checklist.every((item) => item.done);
  const canReview = submitted && vendor.partnerStatus !== "approved" && checklistComplete;
  const documentsComplete = Boolean(
    profile.documents?.drivingLicense && profile.documents?.vehicleRc && profile.documents?.insurance,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Vendor review"
        title={profile.businessName || vendor.name}
        description={`${profile.ownerName || vendor.name} · ${vendor.email}${vendor.phone ? ` · ${vendor.phone}` : ""}`}
        actions={
          <>
            <Link href="/dashboard/admin/vendors" className="btn-outline">
              <ArrowLeft className="h-4 w-4" /> Vendors
            </Link>
            <button type="button" onClick={() => load()} disabled={refreshing} className="btn-outline">
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Refresh
            </button>
          </>
        }
      />

      {error && <p className="rounded-2xl border border-danger/15 bg-danger/5 px-4 py-3 text-xs text-danger">{error}</p>}

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-white px-4 py-3.5">
        <VendorAvatar name={vendor.name} image={vendor.image} size="sm" />
        <div className="mr-2 min-w-0">
          <p className="truncate text-xs font-bold">{vendor.name}</p>
          <p className="text-[10px] text-fg-muted">Joined {formatDate(vendor.createdAt)}</p>
        </div>
        <VendorStatusBadge status={vendor.partnerStatus} />
        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider", kycTone[kycStatus])}>
          <FileCheck2 className="h-3 w-3" /> KYC {kycStatus.replace("_", " ")}
        </span>
        <div className="ml-auto flex flex-wrap gap-2">
          <span className="rounded-full bg-surface-muted px-3 py-1.5 text-[10px] font-semibold text-fg-muted">
            {data.metrics.bookings} bookings
          </span>
          <span className="rounded-full bg-surface-muted px-3 py-1.5 text-[10px] font-semibold text-fg-muted">
            {data.metrics.trips} completed
          </span>
          <span className="rounded-full bg-lime px-3 py-1.5 text-[10px] font-semibold text-ink">
            {inr(data.metrics.netEarnings)} earned
          </span>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_0.6fr]">
        <div className="space-y-5">
          <section className="rounded-3xl border border-line bg-white p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold tracking-tight">Business profile</h2>
                <p className="mt-0.5 text-[10px] text-fg-muted">Applicant and contact information</p>
              </div>
              <span className="grid h-9 w-9 place-items-center rounded-full bg-surface-muted">
                <UserRound className="h-4 w-4 text-fg-muted" />
              </span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <InfoRow label="Business name" value={profile.businessName || "-"} />
              <InfoRow label="Owner name" value={profile.ownerName || "-"} />
              <InfoRow label="Email" value={vendor.email} href={`mailto:${vendor.email}`} icon={Mail} />
              <InfoRow
                label="Phone"
                value={vendor.phone || "Not provided"}
                href={vendor.phone ? `tel:${vendor.phone}` : undefined}
                icon={Phone}
              />
              <InfoRow label="Account created" value={formatDate(vendor.createdAt, true)} />
              <InfoRow
                label="Last updated"
                value={profile.reviewedAt ? formatDate(profile.reviewedAt, true) : formatDate(vendor.createdAt)}
              />
            </div>
          </section>

          <section className="rounded-3xl border border-line bg-white p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold tracking-tight">Vehicle & pricing</h2>
                <p className="mt-0.5 text-[10px] text-fg-muted">The listing created from this application</p>
              </div>
              <span className="rounded-full bg-surface-muted px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-fg-muted">
                {draft.category ? CATEGORY_MAP[draft.category]?.label || draft.category : "No category"}
              </span>
            </div>

            <div className="mt-4 flex flex-col gap-4 sm:flex-row">
              <div className="relative h-32 w-full shrink-0 overflow-hidden rounded-2xl bg-surface-muted sm:h-24 sm:w-36">
                {draft.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={draft.image} alt={draft.name || "Vehicle"} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full place-items-center">
                    <Bike className="h-5 w-5 text-fg-subtle" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">{draft.name || "No vehicle listed"}</p>
                <p className="mt-0.5 text-[10px] text-fg-muted">
                  {[draft.brand, draft.model, draft.year].filter(Boolean).join(" · ") || "Brand and model not provided"}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {draft.registrationNumber && (
                    <span className="rounded-md border border-line bg-surface-muted px-2 py-1 font-mono text-[10px] font-semibold">
                      {draft.registrationNumber}
                    </span>
                  )}
                  {draft.seats && (
                    <span className="rounded-full bg-surface-muted px-2 py-1 text-[10px] font-semibold text-fg-muted">
                      {draft.seats} seats
                    </span>
                  )}
                  {draft.fuel && (
                    <span className="rounded-full bg-surface-muted px-2 py-1 text-[10px] font-semibold capitalize text-fg-muted">
                      {draft.fuel}
                    </span>
                  )}
                  {draft.transmission && (
                    <span className="rounded-full bg-surface-muted px-2 py-1 text-[10px] font-semibold capitalize text-fg-muted">
                      {draft.transmission}
                    </span>
                  )}
                </div>
                {draft.description && (
                  <p className="mt-2 line-clamp-2 text-[10px] leading-relaxed text-fg-muted">{draft.description}</p>
                )}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-line pt-4 sm:grid-cols-5">
              {[
                { label: "Base fare", value: profile.pricing?.baseFare },
                { label: "Per km", value: profile.pricing?.perKm },
                { label: "Per hour", value: profile.pricing?.perHour },
                { label: "Minimum", value: profile.pricing?.minimumFare },
                { label: "Waiting / min", value: profile.pricing?.waitingCharge },
              ].map((item) => (
                <div key={item.label} className="rounded-xl bg-surface-muted/60 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-fg-subtle">{item.label}</p>
                  <p className="mt-1 text-[11px] font-bold">
                    {item.value !== undefined && item.value !== null ? inr(item.value) : "-"}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-line bg-white p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold tracking-tight">Documents</h2>
                <p className="mt-0.5 text-[10px] text-fg-muted">
                  {documentsComplete ? "Required documents uploaded" : "Required documents are missing"}
                </p>
              </div>
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-[10px] font-semibold",
                  documentsComplete ? "bg-success/10 text-success" : "bg-warning/10 text-warning",
                )}
              >
                {documentsComplete ? "Complete" : "Incomplete"}
              </span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {docLabels.map((doc) => {
                const url = profile.documents?.[doc.key] || "";
                return (
                  <div
                    key={doc.key}
                    className={cn(
                      "rounded-2xl border p-3.5",
                      url ? "border-line bg-white" : "border-dashed border-line bg-surface-muted/30",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-surface-muted">
                        {url && isImageDoc(url) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={url} alt={doc.label} className="h-full w-full object-cover" />
                        ) : (
                          <div className="grid h-full place-items-center">
                            {url ? (
                              <FileText className="h-5 w-5 text-fg-subtle" />
                            ) : (
                              <XCircle className="h-5 w-5 text-fg-subtle" />
                            )}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold">
                          {doc.label}
                          {doc.required && <span className="ml-0.5 text-danger">*</span>}
                        </p>
                        <p className={cn("mt-0.5 text-[10px]", url ? "text-success" : "text-fg-subtle")}>
                          {url ? "Uploaded" : doc.required ? "Missing" : "Optional - not provided"}
                        </p>
                        {url && (
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold text-ink underline underline-offset-2 hover:text-success"
                          >
                            Open document <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-3xl border border-line bg-white p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold tracking-tight">Video KYC</h2>
                <p className="mt-0.5 text-[10px] text-fg-muted">Identity verification submitted by the partner</p>
              </div>
              <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider", kycTone[kycStatus])}>
                {kycStatus === "approved" ? <BadgeCheck className="h-3 w-3" /> : <Video className="h-3 w-3" />}
                {kycStatus.replace("_", " ")}
              </span>
            </div>

            {kyc.note && (
              <p className="mt-3 rounded-xl bg-surface-muted/60 px-3.5 py-2.5 text-[10px] leading-relaxed text-fg-muted">
                <span className="font-semibold text-fg">Reviewer note: </span>
                {kyc.note}
              </p>
            )}

            {kyc.videoUrl ? (
              <div className="mt-4 overflow-hidden rounded-2xl border border-line">
                {isVideoDoc(kyc.videoUrl) ? (
                  <video src={kyc.videoUrl} controls className="max-h-80 w-full bg-ink" preload="metadata">
                    Your browser does not support embedded video.
                  </video>
                ) : (
                  <div className="flex items-center justify-between gap-3 bg-surface-muted/50 px-4 py-3">
                    <p className="text-[11px] text-fg-muted">Verification file submitted</p>
                    <a
                      href={kyc.videoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] font-semibold underline underline-offset-2"
                    >
                      Open file <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-line px-4 py-6 text-center">
                <PlayCircle className="mx-auto h-5 w-5 text-fg-subtle" />
                <p className="mt-2 text-[11px] font-semibold">No recorded video</p>
                <p className="mt-0.5 text-[10px] text-fg-muted">
                  {kyc.roomId
                    ? `The partner joined live KYC room ${kyc.roomId}.`
                    : "The partner has not submitted a verification video."}
                </p>
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {zegoEnabled && (
                <button type="button" onClick={() => setKycRoomOpen(true)} className="btn-outline !py-2.5 text-[11px]">
                  <Video className="h-3.5 w-3.5" /> Join live KYC room
                </button>
              )}
              {kyc.roomId && (
                <span className="rounded-full bg-surface-muted px-3 py-1.5 font-mono text-[10px] text-fg-muted">
                  Room {kyc.roomId}
                </span>
              )}
              {kyc.submittedAt && (
                <span className="inline-flex items-center gap-1 text-[10px] text-fg-subtle">
                  <Clock3 className="h-2.5 w-2.5" /> Submitted {formatDate(kyc.submittedAt, true)}
                </span>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-line bg-white p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold tracking-tight">Fleet</h2>
                <p className="mt-0.5 text-[10px] text-fg-muted">
                  {data.vehicles.length} vehicle{data.vehicles.length === 1 ? "" : "s"} registered to this partner
                </p>
              </div>
              <Bike className="h-4 w-4 text-fg-subtle" />
            </div>
            {data.vehicles.length === 0 ? (
              <p className="mt-4 rounded-2xl bg-surface-muted/60 px-4 py-6 text-center text-[11px] text-fg-muted">
                No vehicles have been created from this application yet.
              </p>
            ) : (
              <div className="mt-4 space-y-2">
                {data.vehicles.map((vehicle) => (
                  <div
                    key={vehicle._id}
                    className="flex flex-col gap-2 rounded-2xl border border-line p-3 sm:flex-row sm:items-center sm:gap-3"
                  >
                    <div className="relative h-24 w-full shrink-0 overflow-hidden rounded-xl bg-surface-muted sm:h-12 sm:w-16">
                      {vehicle.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={vehicle.image} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="grid h-full place-items-center">
                          <Bike className="h-4 w-4 text-fg-subtle" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-xs font-bold">{vehicle.name}</p>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                            vehicle.approved ? "bg-success/10 text-success" : "bg-warning/10 text-warning",
                          )}
                        >
                          {vehicle.approved ? "Approved" : "Unlisted"}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                            vehicle.available ? "bg-ink/5 text-fg-muted" : "bg-ink text-white",
                          )}
                        >
                          {vehicle.available ? "Available" : "Offline"}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-[10px] text-fg-muted">
                        {vehicle.registrationNumber} · {vehicle.brand} {vehicle.model} · {inr(vehicle.pricePerKm)}/km
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-4 sm:block sm:text-right">
                      <p className="inline-flex items-center gap-1 text-[10px] text-fg-muted">
                        <Star className="h-2.5 w-2.5 fill-ink" /> {vehicle.rating ? vehicle.rating.toFixed(1) : "New"} ·{" "}
                        {vehicle.totalTrips} trips
                      </p>
                      <Link
                        href={`/book/${vehicle._id}`}
                        className="text-[10px] font-semibold text-fg-muted underline underline-offset-2 hover:text-ink"
                      >
                        View listing
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-line bg-white p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold tracking-tight">Payout account</h2>
                <p className="mt-0.5 text-[10px] text-fg-muted">Full account numbers are encrypted at rest</p>
              </div>
              <Landmark className="h-4 w-4 text-fg-subtle" />
            </div>
            {profile.bank?.accountNumberLast4 ? (
              <div className="mt-4 flex flex-col justify-between gap-3 rounded-2xl bg-surface-muted/60 p-4 sm:flex-row sm:items-center">
                <div>
                  <p className="text-xs font-bold">{profile.bank.accountHolder}</p>
                  <p className="mt-0.5 text-[10px] text-fg-muted">{profile.bank.bankName}</p>
                  {profile.bank.upiId && <p className="mt-0.5 text-[10px] text-fg-muted">UPI: {profile.bank.upiId}</p>}
                </div>
                <div className="sm:text-right">
                  <p className="font-mono text-xs tracking-wider">•••• {profile.bank.accountNumberLast4}</p>
                  <p className="mt-0.5 text-[10px] font-semibold text-fg-muted">{profile.bank.ifsc}</p>
                </div>
              </div>
            ) : (
              <p className="mt-4 rounded-2xl bg-warning/5 px-4 py-3 text-[11px] text-warning">
                No payout account has been added.
              </p>
            )}
            <p className="mt-3 flex items-start gap-1.5 text-[10px] leading-relaxed text-fg-subtle">
              <LockKeyhole className="mt-0.5 h-3 w-3 shrink-0" /> Bank details are encrypted with AES-256-GCM. Only the
              last four digits are exposed to the dashboard.
            </p>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-3xl border border-line bg-white p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-bold tracking-tight">Review decision</h2>
                <p className="mt-0.5 text-[10px] text-fg-muted">{submitted ? "Ready for verification" : "Awaiting submission"}</p>
              </div>
              <ShieldCheck className="h-4 w-4 text-fg-subtle" />
            </div>

            {!submitted && (
              <div className="mt-4 rounded-2xl bg-surface-muted/60 px-3.5 py-3 text-[10px] leading-relaxed text-fg-muted">
                This vendor has not submitted their application. They can still edit their onboarding steps.
              </div>
            )}

            {vendor.partnerStatus === "approved" ? (
              <div className="mt-4 rounded-2xl border border-success/20 bg-success/5 p-4">
                <div className="flex items-center gap-2 text-success">
                  <BadgeCheck className="h-4 w-4" />
                  <p className="text-xs font-bold">Vendor approved</p>
                </div>
                <p className="mt-1 text-[10px] leading-relaxed text-fg-muted">
                  Vehicles are live and visible to riders.
                  {profile.reviewedAt ? ` Approved ${formatDate(profile.reviewedAt, true)}.` : ""}
                </p>
              </div>
            ) : (
              <>
                {vendor.partnerStatus === "rejected" && profile.rejectionReason && (
                  <div className="mt-4 rounded-2xl border border-danger/15 bg-danger/5 p-3.5">
                    <p className="text-[10px] font-bold text-danger">Last review note</p>
                    <p className="mt-1 text-[10px] leading-relaxed text-fg-muted">{profile.rejectionReason}</p>
                  </div>
                )}
                <div className="mt-4 space-y-2">
                  <button
                    type="button"
                    onClick={() => setAction("approve")}
                    disabled={!canReview}
                    className="btn-dark w-full !bg-success hover:!bg-success/90"
                  >
                    <Check className="h-4 w-4" /> Approve vendor
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setResetKyc(profile.kyc?.status !== "approved");
                      setAction("reject");
                    }}
                    disabled={!submitted}
                    className="btn-outline w-full text-danger"
                  >
                    <X className="h-4 w-4" /> Request changes
                  </button>
                </div>
                <p className="mt-2 text-center text-[10px] leading-relaxed text-fg-subtle">
                  {canReview
                    ? "Approving publishes all of this vendor's vehicles and notifies them by email."
                    : submitted
                      ? "This application has already been reviewed."
                      : "You can review once the application is submitted."}
                </p>
              </>
            )}
          </section>

          <section className="rounded-3xl border border-line bg-white p-5">
            <h2 className="font-display text-base font-bold tracking-tight">Compliance checklist</h2>
            <div className="mt-3 space-y-2.5">
              {checklist.map((item) => (
                <div key={item.label} className="flex items-start gap-2 text-[11px]">
                  <span
                    className={cn(
                      "mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full",
                      item.done ? "bg-success/10 text-success" : "bg-warning/10 text-warning",
                    )}
                  >
                    {item.done ? <Check className="h-2.5 w-2.5" /> : <AlertTriangle className="h-2.5 w-2.5" />}
                  </span>
                  <span className={cn("leading-relaxed", item.done ? "text-fg-muted" : "font-semibold text-ink")}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
            {profile.kyc?.status === "rejected" && (
              <p className="mt-3 rounded-xl bg-danger/5 px-3 py-2 text-[10px] leading-relaxed text-danger">
                Video KYC was previously rejected. A fresh submission is required before approval.
              </p>
            )}
          </section>

          <section className="rounded-3xl border border-line bg-white p-5">
            <h2 className="font-display text-base font-bold tracking-tight">Timeline</h2>
            <div className="mt-3 space-y-3">
              <TimelineRow
                icon={UserRound}
                label="Account created"
                value={formatDate(vendor.createdAt, true)}
                done
              />
              <TimelineRow
                icon={FileCheck2}
                label="Application submitted"
                value={profile.submittedAt ? formatDate(profile.submittedAt, true) : "Not yet"}
                done={Boolean(profile.submittedAt)}
              />
              <TimelineRow
                icon={ShieldCheck}
                label="Review completed"
                value={profile.reviewedAt ? formatDate(profile.reviewedAt, true) : "Pending"}
                done={Boolean(profile.reviewedAt)}
              />
            </div>
          </section>

          <section className="rounded-3xl bg-ink p-5 text-white">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-lime">Partner contact</p>
            <p className="mt-2 text-sm font-bold">{profile.ownerName || vendor.name}</p>
            <div className="mt-3 space-y-2 text-[11px]">
              <a href={`mailto:${vendor.email}`} className="flex items-center gap-2 text-fg-inverse-muted hover:text-white">
                <Mail className="h-3.5 w-3.5 text-lime" /> {vendor.email}
              </a>
              {vendor.phone && (
                <a href={`tel:${vendor.phone}`} className="flex items-center gap-2 text-fg-inverse-muted hover:text-white">
                  <Phone className="h-3.5 w-3.5 text-lime" /> {vendor.phone}
                </a>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-line bg-white p-5">
            <div className="flex items-center gap-2 text-sm font-bold">
              <Wallet className="h-4 w-4" /> Partner activity
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-surface-muted/60 p-3">
                <p className="text-[10px] uppercase tracking-wider text-fg-subtle">Bookings</p>
                <p className="mt-1 text-base font-extrabold">{data.metrics.bookings}</p>
              </div>
              <div className="rounded-2xl bg-surface-muted/60 p-3">
                <p className="text-[10px] uppercase tracking-wider text-fg-subtle">Completed</p>
                <p className="mt-1 text-base font-extrabold">{data.metrics.trips}</p>
              </div>
              <div className="col-span-2 rounded-2xl bg-lime p-3">
                <p className="text-[10px] uppercase tracking-wider text-fg-muted">Net earnings</p>
                <p className="mt-1 text-base font-extrabold">{inr(data.metrics.netEarnings)}</p>
              </div>
            </div>
          </section>
        </aside>
      </div>

      <Modal
        open={action === "approve"}
        onClose={() => !saving && setAction(null)}
        labelledBy="approve-vendor-title"
        className="max-w-sm"
      >
        <div className="flex items-center gap-2 text-success">
          <ShieldCheck className="h-4 w-4" />
          <span className="text-[10px] font-semibold uppercase tracking-wider">Approve vendor</span>
        </div>
        <div id="approve-vendor-title" className="font-display mt-3 text-2xl font-extrabold tracking-tight">
          Publish {profile.businessName || vendor.name}?
        </div>
        <p className="mt-2 text-sm leading-relaxed text-fg-muted">
          All vehicles owned by this partner will go live. The partner receives an approval email and a dashboard
          notification.
        </p>
        <div className="mt-3 space-y-1.5 rounded-2xl bg-surface-muted/60 p-3.5 text-[10px]">
          {checklist.map((item) => (
            <p key={item.label} className={cn("flex items-center gap-1.5", item.done ? "text-fg-muted" : "text-warning")}>
              {item.done ? <Check className="h-3 w-3 text-success" /> : <AlertTriangle className="h-3 w-3" />}
              {item.label}
            </p>
          ))}
        </div>
        <div className="mt-5 flex gap-2">
          <button type="button" onClick={() => setAction(null)} disabled={saving} className="btn-outline flex-1">
            Back
          </button>
          <button
            type="button"
            onClick={submitReview}
            disabled={saving || !canReview}
            className="btn flex-1 !bg-success text-white hover:!bg-success/90"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Approve vendor
          </button>
        </div>
      </Modal>

      <Modal
        open={action === "reject"}
        onClose={() => !saving && setAction(null)}
        labelledBy="reject-vendor-title"
        className="max-w-md"
      >
        <div className="flex items-center gap-2 text-danger">
          <ShieldAlert className="h-4 w-4" />
          <span className="text-[10px] font-semibold uppercase tracking-wider">Request changes</span>
        </div>
        <div id="reject-vendor-title" className="font-display mt-3 text-2xl font-extrabold tracking-tight">
          What needs fixing?
        </div>
        <p className="mt-2 text-sm leading-relaxed text-fg-muted">
          The partner sees this note in their onboarding and receives an email. Fixed documents can be resubmitted
          without repeating video KYC unless you ask for a fresh verification.
        </p>
        <textarea
          rows={4}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="e.g. The vehicle RC is blurry. Re-upload a clear photo of the full document."
          className="input mt-4 resize-none"
          maxLength={500}
        />
        <label className="mt-4 flex cursor-pointer items-start gap-2.5 rounded-2xl border border-line p-3.5">
          <input
            type="checkbox"
            checked={resetKyc}
            onChange={(event) => setResetKyc(event.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-danger"
          />
          <span>
            <span className="block text-xs font-bold">Require a fresh video KYC</span>
            <span className="mt-0.5 block text-[10px] leading-relaxed text-fg-muted">
              Clears the current verification so the partner must start a new live call or upload a new video. Leave
              unchecked when only documents need fixing.
            </span>
          </span>
        </label>
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={() => setAction(null)} disabled={saving} className="btn-outline flex-1">
            Back
          </button>
          <button
            type="button"
            onClick={submitReview}
            disabled={saving || !reason.trim()}
            className="btn flex-1 bg-danger text-white hover:bg-danger/90"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Send for changes
          </button>
        </div>
      </Modal>

      <ZegoKycRoom
        open={kycRoomOpen}
        vendorId={vendor.id}
        onClose={() => setKycRoomOpen(false)}
        onJoined={() => toast.success("Connected to the vendor's KYC room")}
      />
    </div>
  );
}

function InfoRow({
  label,
  value,
  href,
  icon: Icon,
}: {
  label: string;
  value: string;
  href?: string;
  icon?: typeof Mail;
}) {
  return (
    <div className="rounded-2xl border border-line px-3.5 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-fg-subtle">{label}</p>
      {href ? (
        <a href={href} className="mt-1 inline-flex max-w-full items-center gap-1.5 truncate text-[11px] font-semibold hover:underline">
          {Icon && <Icon className="h-3 w-3 shrink-0 text-fg-subtle" />}
          <span className="truncate">{value}</span>
        </a>
      ) : (
        <p className="mt-1 flex items-center gap-1.5 truncate text-[11px] font-semibold">
          {Icon && <Icon className="h-3 w-3 shrink-0 text-fg-subtle" />}
          {value}
        </p>
      )}
    </div>
  );
}

function TimelineRow({
  icon: Icon,
  label,
  value,
  done,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
  done: boolean;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span
        className={cn(
          "grid h-7 w-7 shrink-0 place-items-center rounded-full",
          done ? "bg-success/10 text-success" : "bg-surface-muted text-fg-subtle",
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div>
        <p className="text-[10px] font-semibold">{label}</p>
        <p className="text-[10px] text-fg-subtle">{value}</p>
      </div>
    </div>
  );
}
