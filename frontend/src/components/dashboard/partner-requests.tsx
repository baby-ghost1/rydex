"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  CalendarDays,
  Check,
  Clock3,
  CreditCard,
  Loader2,
  MessageCircle,
  PackageOpen,
  Phone,
  RefreshCw,
  Route as RouteIcon,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/dashboard/ui";
import StatusBadge from "@/components/status-badge";
import Modal from "@/components/ui/modal";
import { api } from "@/lib/client-api";
import { cn, formatDate, initials, inr, timeAgo } from "@rydex/shared/utils";

interface RequestRide {
  _id: string;
  status: string;
  paymentMethod: "cash" | "online";
  paymentStatus: "pending" | "paid" | "refunded" | "failed";
  date: string;
  time: string;
  distanceKm: number;
  durationMin: number;
  notes?: string;
  createdAt: string;
  pickup: { address: string };
  drop: { address: string };
  fare: { total: number; partnerEarning: number; platformFee: number };
  vehicle?: { name: string; image: string; registrationNumber?: string } | null;
  user?: { name: string; phone?: string; image?: string } | null;
}

export default function PartnerRequests() {
  const { data: session } = useSession();
  const [rides, setRides] = useState<RequestRide[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [action, setAction] = useState("");
  const [error, setError] = useState("");
  const [rejecting, setRejecting] = useState<RequestRide | null>(null);
  const [reason, setReason] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const data = await api<{ bookings: RequestRide[] }>("/api/bookings?as=partner&status=pending&limit=50");
      setRides(data.bookings || []);
      setLastUpdated(new Date());
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load ride requests.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(() => load(true), 12_000);
    return () => clearInterval(interval);
  }, [load]);

  const sorted = useMemo(
    () => [...rides].sort((a, b) => new Date(a.date + "T" + a.time).getTime() - new Date(b.date + "T" + b.time).getTime()),
    [rides],
  );
  const awaitingPayment = rides.filter((ride) => ride.paymentMethod === "online" && ride.paymentStatus !== "paid").length;
  const potential = rides.reduce((sum, ride) => sum + ride.fare.partnerEarning, 0);
  const isApproved = session?.user.partnerStatus === "approved";

  async function accept(ride: RequestRide) {
    setAction(`accept-${ride._id}`);
    try {
      await api(`/api/bookings/${ride._id}`, { method: "PATCH", json: { status: "accepted" } });
      setRides((current) => current.filter((item) => item._id !== ride._id));
      toast.success("Ride accepted — head to the pickup");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not accept the ride.");
      await load(true);
    } finally {
      setAction("");
    }
  }

  async function reject() {
    if (!rejecting || !reason.trim()) return;
    setAction(`reject-${rejecting._id}`);
    try {
      await api(`/api/bookings/${rejecting._id}`, {
        method: "PATCH",
        json: { status: "rejected", reason },
      });
      setRides((current) => current.filter((item) => item._id !== rejecting._id));
      toast.success("Request declined");
      setRejecting(null);
      setReason("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not decline the ride.");
    } finally {
      setAction("");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Request queue"
        title="Incoming rides."
        description="Accept quickly, check the route and payment status, then head to your rider."
        actions={
          <>
            <button type="button" onClick={() => load()} disabled={refreshing} className="btn-outline">
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} /> Refresh
            </button>
            <Link href="/dashboard/partner/rides" className="btn-dark">
              All rides <ArrowRight className="h-4 w-4" />
            </Link>
          </>
        }
      />

      {!isApproved && (
        <div className="rounded-2xl border border-warning/20 bg-warning/5 px-4 py-3 text-xs text-warning">
          Your partner account isn&apos;t approved yet. New requests will appear here once your application is live.
        </div>
      )}

      {error && <p className="rounded-2xl border border-danger/15 bg-danger/5 px-4 py-3 text-xs text-danger">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-line bg-white p-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-fg-subtle">Waiting</p>
            <span className="grid h-7 w-7 place-items-center rounded-full bg-warning/10 text-warning"><Clock3 className="h-3.5 w-3.5" /></span>
          </div>
          <p className="font-display mt-3 text-2xl font-extrabold">{loading ? "—" : rides.length}</p>
          <p className="mt-0.5 text-[10px] text-fg-subtle">Requests awaiting a response</p>
        </div>
        <div className="rounded-2xl border border-line bg-white p-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-fg-subtle">Potential earnings</p>
            <span className="grid h-7 w-7 place-items-center rounded-full bg-success/10 text-success"><Banknote className="h-3.5 w-3.5" /></span>
          </div>
          <p className="font-display mt-3 text-2xl font-extrabold">{loading ? "—" : inr(potential)}</p>
          <p className="mt-0.5 text-[10px] text-fg-subtle">Your 90% share if all are completed</p>
        </div>
        <div className="rounded-2xl border border-line bg-white p-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-fg-subtle">Payment checks</p>
            <span className="grid h-7 w-7 place-items-center rounded-full bg-warning/10 text-warning"><CreditCard className="h-3.5 w-3.5" /></span>
          </div>
          <p className="font-display mt-3 text-2xl font-extrabold">{loading ? "—" : awaitingPayment}</p>
          <p className="mt-0.5 text-[10px] text-fg-subtle">Online bookings awaiting payment</p>
        </div>
      </div>

      <div className="flex flex-col justify-between gap-2 text-[10px] text-fg-subtle sm:flex-row sm:items-center">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-success" />
          Auto-refreshing every 12 seconds
        </span>
        {lastUpdated && <span>Updated {timeAgo(lastUpdated)}</span>}
      </div>

      <div className="space-y-3">
        {loading &&
          Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="skeleton h-64 rounded-3xl bg-white" />
          ))}

        {!loading &&
          sorted.map((ride) => {
            const awaiting = ride.paymentMethod === "online" && ride.paymentStatus !== "paid";
            return (
              <article key={ride._id} className="overflow-hidden rounded-3xl border border-line bg-white">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface-muted/40 px-4 py-3 sm:px-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-ink px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
                      <Sparkles className="h-3 w-3 text-lime" /> New request
                    </span>
                    <StatusBadge status={ride.status} dot={false} className="!px-2 !py-0.5 !text-[10px]" />
                    <span className="text-[10px] text-fg-subtle">requested {timeAgo(ride.createdAt)}</span>
                  </div>
                  <span className="text-[10px] font-semibold text-fg-muted">
                    #{ride._id.slice(-8).toUpperCase()}
                  </span>
                </div>

                <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[1.35fr_0.65fr]">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="grid h-11 w-11 place-items-center overflow-hidden rounded-full bg-surface-muted text-xs font-bold">
                        {ride.user?.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={ride.user.image} alt="" className="h-full w-full object-cover" />
                        ) : (
                          initials(ride.user?.name)
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">{ride.user?.name || "RYDEX rider"}</p>
                        <p className="text-[10px] text-fg-muted">{ride.vehicle?.name || "Vehicle"}</p>
                      </div>
                      {ride.user?.phone && (
                        <a href={`tel:${ride.user.phone}`} className="grid h-11 w-11 place-items-center rounded-full border border-line text-fg-muted transition hover:border-line-strong hover:text-ink" aria-label="Call rider">
                          <Phone className="h-4 w-4" aria-hidden="true" />
                        </a>
                      )}
                      <Link href={`/bookings/${ride._id}`} className="grid h-11 w-11 place-items-center rounded-full border border-line text-fg-muted transition hover:border-line-strong hover:text-ink" aria-label="Open ride details">
                        <MessageCircle className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    </div>

                    <div className="rounded-2xl bg-surface-muted/60 p-4">
                      <div className="flex items-start gap-3">
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-ink" />
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase tracking-wider text-fg-subtle">Pickup</p>
                          <p className="mt-0.5 text-xs font-medium leading-relaxed text-fg">{ride.pickup.address}</p>
                        </div>
                      </div>
                      <div className="ml-[3px] my-2 h-4 border-l border-dashed border-line-strong" />
                      <div className="flex items-start gap-3">
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-lime ring-1 ring-ink/20" />
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase tracking-wider text-fg-subtle">Drop</p>
                          <p className="mt-0.5 text-xs font-medium leading-relaxed text-fg">{ride.drop.address}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-[10px] text-fg-muted">
                      <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3 w-3" /> {formatDate(ride.date)} at {ride.time}</span>
                      <span className="inline-flex items-center gap-1.5"><RouteIcon className="h-3 w-3" /> {ride.distanceKm} km · {ride.durationMin} min</span>
                      <span className={cn("inline-flex items-center gap-1.5 font-semibold", awaiting ? "text-warning" : "text-success")}>
                        {awaiting ? <CreditCard className="h-3 w-3" /> : <Banknote className="h-3 w-3" />}
                        {ride.paymentMethod === "online" ? (awaiting ? "Online payment pending" : "Paid online") : "Cash after ride"}
                      </span>
                    </div>

                    {ride.notes && (
                      <p className="rounded-xl border border-line px-3.5 py-2.5 text-[11px] leading-relaxed text-fg-muted">
                        <span className="font-semibold text-ink">Rider note: </span>{ride.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col justify-between gap-4 rounded-2xl border border-line p-4">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-fg-subtle">Trip fare</p>
                      <p className="font-display mt-1 text-2xl font-extrabold tracking-tight">{inr(ride.fare.total)}</p>
                      <div className="mt-2 space-y-1.5 text-[10px] text-fg-muted">
                        <div className="flex justify-between"><span>Your earning</span><span className="font-semibold text-success">{inr(ride.fare.partnerEarning)}</span></div>
                        <div className="flex justify-between"><span>Platform fee</span><span>{inr(ride.fare.platformFee)}</span></div>
                      </div>
                    </div>

                    {awaiting ? (
                      <div className="rounded-xl bg-warning/5 px-3 py-2.5 text-[10px] leading-relaxed text-warning">
                        You can accept once the rider&apos;s online payment is confirmed.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <button type="button" onClick={() => accept(ride)} disabled={Boolean(action) || !isApproved} className="btn-dark w-full">
                          {action === `accept-${ride._id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                          Accept ride
                        </button>
                        <button type="button" onClick={() => setRejecting(ride)} disabled={Boolean(action)} className="btn-outline w-full text-danger">
                          <X className="h-4 w-4" /> Decline
                        </button>
                      </div>
                    )}
                    <Link href={`/bookings/${ride._id}`} className="inline-flex min-h-11 items-center justify-center text-xs font-semibold text-fg-muted underline underline-offset-2 hover:text-ink">
                      View full request
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
      </div>

      {!loading && sorted.length === 0 && (
        <div className="rounded-3xl border border-dashed border-line bg-surface/60 px-6 py-20 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white shadow-sm">
            <PackageOpen className="h-6 w-5 text-fg-subtle" />
          </div>
          <p className="font-display mt-4 text-xl font-bold">Queue clear.</p>
          <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-fg-muted">
            New ride requests will appear here automatically. Keep your fleet marked available to receive more bookings.
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <Link href="/dashboard/partner/fleet" className="btn-outline">Manage fleet</Link>
            <Link href="/dashboard/partner/rides" className="btn-dark">View all rides</Link>
          </div>
        </div>
      )}

      <section className="rounded-3xl border border-line bg-white p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-lime"><ShieldCheck className="h-4 w-4" /></span>
          <div>
            <p className="text-sm font-bold">Accept only rides you can complete.</p>
            <p className="mt-1 text-[11px] leading-relaxed text-fg-muted">
              Repeated cancellations or unfulfilled accepted rides affect your partner score. If plans change, decline with a clear reason.
            </p>
          </div>
        </div>
      </section>

      <Modal open={Boolean(rejecting)} onClose={() => setRejecting(null)} labelledBy="decline-title" className="max-w-sm">
        <div className="flex items-center gap-2 text-danger"><AlertTriangle className="h-4 w-4" /><span className="text-[10px] font-semibold uppercase tracking-wider">Decline request</span></div>
        <div id="decline-title" className="font-display mt-3 text-2xl font-extrabold tracking-tight">Why can&apos;t you take it?</div>
        <p className="mt-2 text-sm leading-relaxed text-fg-muted">
          The rider sees this reason. Any eligible online payment is refunded automatically.
        </p>
        <textarea
          rows={3}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="e.g. Vehicle is in service until tomorrow morning."
          className="input mt-4 resize-none"
          maxLength={300}
        />
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={() => setRejecting(null)} className="btn-outline flex-1">Back</button>
          <button
            type="button"
            onClick={reject}
            disabled={!reason.trim() || Boolean(action)}
            className="btn flex-1 bg-danger text-white hover:bg-danger/90"
          >
            {action.startsWith("reject-") && <Loader2 className="h-4 w-4 animate-spin" />} Decline ride
          </button>
        </div>
      </Modal>
    </div>
  );
}
