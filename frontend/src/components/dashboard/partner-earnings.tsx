"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowDownToLine,
  BadgeIndianRupee,
  Banknote,
  CalendarDays,
  CarFront,
  CreditCard,
  Landmark,
  Loader2,
  LockKeyhole,
  Pencil,
  RefreshCw,
  Route as RouteIcon,
  Star,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader, StatCard } from "@/components/dashboard/ui";
import { MiniBarChart, ProgressRow } from "@/components/dashboard/mini-charts";
import Modal from "@/components/ui/modal";
import { api } from "@/lib/client-api";
import { cn, formatDate, inr } from "@rydex/shared/utils";

interface EarningBooking {
  _id: string;
  completedAt?: string;
  date: string;
  time: string;
  distanceKm: number;
  fare: { total: number; partnerEarning: number; platformFee: number };
  paymentMethod: "cash" | "online";
  pickup: { address: string };
  drop: { address: string };
  vehicle?: { name: string; image: string } | null;
  user?: { name: string } | null;
  rating?: number;
}

interface EarningsData {
  range: string;
  summary: {
    gross: number;
    net: number;
    platform: number;
    trips: number;
    distance: number;
    avgRating: number;
    avgPerTrip: number;
  };
  monthly: Array<{ _id: { y: number; m: number }; net: number; gross: number; trips: number }>;
  paymentSplit: Array<{ _id: string; total: number; count: number }>;
  bookings: EarningBooking[];
  bank: {
    accountHolder: string;
    bankName: string;
    accountNumberLast4: string;
    ifsc: string;
    upiId?: string;
  };
}

const ranges = [
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "year", label: "This year" },
  { key: "all", label: "All time" },
];

interface PayoutForm {
  accountHolder: string;
  accountNumber: string;
  confirmAccountNumber: string;
  ifsc: string;
  bankName: string;
  upiId: string;
}

export default function PartnerEarnings() {
  const [range, setRange] = useState("month");
  const [data, setData] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [payoutOpen, setPayoutOpen] = useState(false);
  const [savingPayout, setSavingPayout] = useState(false);
  const [bank, setBank] = useState<EarningsData["bank"] | null>(null);
  const [form, setForm] = useState<PayoutForm>({
    accountHolder: "",
    accountNumber: "",
    confirmAccountNumber: "",
    ifsc: "",
    bankName: "",
    upiId: "",
  });

  async function load(nextRange = range, silent = false) {
    if (!silent) setRefreshing(true);
    try {
      const result = await api<EarningsData>(`/api/partner/earnings?range=${nextRange}`);
      setData(result);
      setBank(result.bank);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load your earnings.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load(range);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  function openPayout() {
    if (!bank) return;
    setForm({
      accountHolder: bank.accountHolder || "",
      accountNumber: "",
      confirmAccountNumber: "",
      ifsc: bank.ifsc || "",
      bankName: bank.bankName || "",
      upiId: bank.upiId || "",
    });
    setPayoutOpen(true);
  }

  async function savePayout(event: React.FormEvent) {
    event.preventDefault();
    if (form.accountNumber !== form.confirmAccountNumber) {
      toast.error("Account numbers do not match.");
      return;
    }
    setSavingPayout(true);
    try {
      const result = await api<{ bank: EarningsData["bank"] & { upiId?: string } }>("/api/partner/payout", {
        method: "PATCH",
        json: form,
      });
      setBank(result.bank);
      toast.success("Payout details updated securely");
      setPayoutOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update payout details.");
    } finally {
      setSavingPayout(false);
    }
  }

  const summary = data?.summary;
  const chart = useMemo(
    () =>
      [...(data?.monthly || [])]
        .slice(0, 12)
        .reverse()
        .map((month) => ({
          label: `${new Date(month._id.y, month._id.m - 1).toLocaleString("en-IN", { month: "short" })} ${String(month._id.y).slice(2)}`,
          value: month.net,
          hint: `${month.trips} trips`,
        })),
    [data?.monthly],
  );
  const splitTotal = (data?.paymentSplit || []).reduce((sum, item) => sum + item.total, 0);

  function exportCsv() {
    if (!data?.bookings.length) {
      toast.info("There are no completed rides in this range.");
      return;
    }
    const rows = [
      ["Booking ID", "Completed on", "Rider", "Vehicle", "Route", "Distance km", "Gross fare", "Platform fee", "Partner earning", "Payment method", "Rating"],
      ...data.bookings.map((booking) => [
        booking._id,
        booking.completedAt ? formatDate(booking.completedAt, true) : `${booking.date} ${booking.time}`,
        booking.user?.name || "",
        booking.vehicle?.name || "",
        `${booking.pickup.address} to ${booking.drop.address}`,
        String(booking.distanceKm),
        String(booking.fare.total),
        String(booking.fare.platformFee),
        String(booking.fare.partnerEarning),
        booking.paymentMethod,
        booking.rating ? String(booking.rating) : "",
      ]),
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `rydex-earnings-${range}-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Earnings CSV downloaded");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Earnings"
        title="Know your numbers."
        description="Track completed trips, platform fees and your 90% partner share. Update payout details securely."
        actions={
          <>
            <button type="button" onClick={exportCsv} className="btn-outline">
              <ArrowDownToLine className="h-4 w-4" /> Export CSV
            </button>
            <button type="button" onClick={openPayout} className="btn-dark">
              <Landmark className="h-4 w-4" /> Payout settings
            </button>
          </>
        }
      />

      {error && <p className="rounded-2xl border border-danger/15 bg-danger/5 px-4 py-3 text-xs text-danger">{error}</p>}

      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="no-scrollbar flex gap-1 overflow-x-auto rounded-full border border-line bg-white p-1.5">
          {ranges.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setRange(item.key)}
              className={cn(
                "inline-flex min-h-11 shrink-0 items-center rounded-full px-3.5 text-xs font-semibold transition",
                range === item.key ? "bg-ink text-white" : "text-fg-muted hover:bg-surface-muted hover:text-ink",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => load()} disabled={refreshing} className="inline-flex min-h-11 items-center gap-1.5 self-start rounded-full border border-line bg-white px-3.5 text-xs font-semibold text-fg-muted transition hover:border-line-strong hover:text-ink">
          <RefreshCw className={cn("h-3 w-3", refreshing && "animate-spin")} /> Refresh report
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Net earnings" value={loading ? "—" : inr(summary?.net || 0)} hint="Your 90% share" icon={Wallet} tone="lime" />
        <StatCard label="Gross fares" value={loading ? "—" : inr(summary?.gross || 0)} hint={`${inr(summary?.platform || 0)} platform fee`} icon={BadgeIndianRupee} />
        <StatCard label="Completed trips" value={loading ? "—" : summary?.trips || 0} hint={`${summary?.distance ? Math.round(summary.distance) : 0} km travelled`} icon={RouteIcon} />
        <StatCard label="Average per trip" value={loading ? "—" : inr(summary?.avgPerTrip || 0)} hint={summary?.avgRating ? `${summary.avgRating.toFixed(1)} rider rating` : "Build your rating"} icon={TrendingUp} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="space-y-5">
          <section className="rounded-3xl border border-line bg-white p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold tracking-tight">Monthly earnings</h2>
                <p className="mt-0.5 text-[11px] text-fg-muted">Net partner earnings, last 12 months</p>
              </div>
              <span className="rounded-full bg-surface-muted px-3 py-1.5 text-[10px] font-semibold text-fg-muted">
                {ranges.find((item) => item.key === range)?.label}
              </span>
            </div>
            {chart.length ? (
              <MiniBarChart data={chart} format={(value) => inr(value, true)} className="mt-5" />
            ) : (
              <div className="mt-5 grid h-40 place-items-center rounded-2xl bg-surface-muted/50 text-[11px] text-fg-subtle">
                Complete rides to start your earnings history.
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-3xl border border-line bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-5">
              <div>
                <h2 className="font-display text-lg font-bold tracking-tight">Completed trip ledger</h2>
                <p className="mt-0.5 text-[11px] text-fg-muted">{data?.bookings.length || 0} latest trips in this range</p>
              </div>
              <Link href="/dashboard/partner/rides" className="inline-flex items-center gap-1 text-[10px] font-semibold text-fg-muted hover:text-ink">
                All rides <ArrowDownToLine className="h-3 w-3 rotate-90" />
              </Link>
            </div>

            {loading && <div className="p-5"><div className="skeleton h-48 rounded-2xl" /></div>}

            {!loading && (!data?.bookings || data.bookings.length === 0) && (
              <div className="px-6 py-14 text-center">
                <Wallet className="mx-auto h-6 w-6 text-fg-subtle" />
                <p className="font-display mt-3 text-lg font-bold">No completed trips yet</p>
                <p className="mt-1 text-xs text-fg-muted">Earnings appear here after a ride is completed.</p>
                <Link href="/dashboard/partner/requests" className="btn-dark mt-5">View requests</Link>
              </div>
            )}

            {!loading && data?.bookings && data.bookings.length > 0 && (
              <div className="divide-y divide-line">
                {data.bookings.map((booking) => (
                  <Link key={booking._id} href={`/bookings/${booking._id}`} className="group flex flex-col gap-3 p-4 transition hover:bg-surface-muted/40 sm:flex-row sm:items-center">
                    <div className="relative h-20 w-full shrink-0 overflow-hidden rounded-xl bg-surface-muted sm:h-12 sm:w-16">
                      {booking.vehicle?.image ? (
                        <Image src={booking.vehicle.image} alt="" fill sizes="64px" className="object-cover" />
                      ) : (
                        <div className="grid h-full place-items-center"><CarFront className="h-4 w-4 text-fg-subtle" /></div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold">{booking.user?.name || "RYDEX rider"} <span className="font-normal text-fg-subtle">·</span> <span className="font-medium text-fg-muted">{booking.vehicle?.name}</span></p>
                      <p className="mt-1 truncate text-[10px] text-fg-muted">{booking.pickup.address.split(",")[0]} → {booking.drop.address.split(",")[0]}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 text-[10px] text-fg-subtle">
                        <span className="inline-flex items-center gap-1"><CalendarDays className="h-2.5 w-2.5" /> {formatDate(booking.completedAt || booking.date)}</span>
                        <span className="inline-flex items-center gap-1"><RouteIcon className="h-2.5 w-2.5" /> {booking.distanceKm} km</span>
                        <span className="inline-flex items-center gap-1"><CreditCard className="h-2.5 w-2.5" /> {booking.paymentMethod === "cash" ? "Cash" : "Online"}</span>
                        {booking.rating && <span className="inline-flex items-center gap-1"><Star className="h-2.5 w-2.5 fill-ink" /> {booking.rating}.0</span>}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center justify-between gap-4 border-t border-line pt-2 sm:block sm:border-0 sm:pt-0 sm:text-right">
                      <div>
                        <p className="text-[10px] text-fg-subtle">Net earning</p>
                        <p className="text-sm font-extrabold text-success">{inr(booking.fare.partnerEarning)}</p>
                      </div>
                      <p className="text-[10px] text-fg-subtle sm:mt-0.5">{inr(booking.fare.total)} fare</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-3xl border border-line bg-white p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-bold tracking-tight">Payout account</h2>
                <p className="mt-0.5 text-[10px] text-fg-muted">Encrypted at rest</p>
              </div>
              <span className="grid h-9 w-9 place-items-center rounded-full bg-surface-muted"><Landmark className="h-4 w-4" /></span>
            </div>
            {bank?.accountNumberLast4 ? (
              <div className="mt-4 rounded-2xl bg-surface-muted/70 p-4">
                <p className="text-xs font-bold">{bank.accountHolder}</p>
                <p className="mt-1 text-[10px] text-fg-muted">{bank.bankName}</p>
                <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                  <span className="font-mono text-xs tracking-wider">•••• {bank.accountNumberLast4}</span>
                  <span className="text-[10px] font-semibold text-fg-muted">{bank.ifsc}</span>
                </div>
              </div>
            ) : (
              <p className="mt-4 rounded-2xl bg-warning/5 px-4 py-3 text-[11px] text-warning">
                Add a payout account to receive your earnings.
              </p>
            )}
            <button type="button" onClick={openPayout} className="btn-outline mt-4 w-full !py-2.5 text-[11px]">
              <Pencil className="h-3.5 w-3.5" /> Update payout details
            </button>
            <p className="mt-3 flex items-start gap-1.5 text-[10px] leading-relaxed text-fg-subtle">
              <LockKeyhole className="mt-0.5 h-3 w-3 shrink-0" /> Full account numbers are encrypted with AES-256-GCM and never shown after saving.
            </p>
          </section>

          <section className="rounded-3xl border border-line bg-white p-5">
            <h2 className="font-display text-lg font-bold tracking-tight">Payment mix</h2>
            <p className="mt-0.5 text-[10px] text-fg-muted">All-time net earnings by method</p>
            <div className="mt-4 space-y-4">
              {(data?.paymentSplit || []).length ? (
                data!.paymentSplit.map((item) => (
                  <ProgressRow
                    key={item._id}
                    label={item._id === "cash" ? "Cash" : "Online"}
                    value={item.total}
                    max={splitTotal}
                    format={(value) => inr(value)}
                    tone={item._id === "online" ? "success" : "dark"}
                  />
                ))
              ) : (
                <p className="text-[11px] leading-relaxed text-fg-muted">Payment mix appears after your first completed ride.</p>
              )}
            </div>
            <div className="mt-5 flex items-center justify-between rounded-2xl bg-ink px-4 py-3 text-white">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-fg-inverse-subtle">Partner share</p>
                <p className="font-display text-lg font-extrabold text-lime">90%</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider text-fg-inverse-subtle">Platform fee</p>
                <p className="font-display text-lg font-extrabold">10%</p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-line bg-white p-5">
            <div className="flex items-center gap-2 text-sm font-bold"><Banknote className="h-4 w-4" /> How earnings work</div>
            <div className="mt-3 space-y-2.5 text-[11px] leading-relaxed text-fg-muted">
              <p>Earnings are calculated when a ride is marked complete with the rider&apos;s drop OTP.</p>
              <p>Cash fares are collected directly by you. Online fares are processed by RYDEX.</p>
              <p>Your ledger always shows the gross fare, platform fee and your 90% net share.</p>
            </div>
            <Link href="/contact" className="mt-3 inline-block text-[11px] font-semibold underline underline-offset-2">Payout support</Link>
          </section>
        </aside>
      </div>

      <Modal open={payoutOpen} onClose={() => setPayoutOpen(false)} labelledBy="payout-title" className="max-w-lg">
        <p className="eyebrow">Secure payouts</p>
        <div id="payout-title" className="font-display mt-1 text-2xl font-extrabold tracking-tight">Update payout account</div>
        <p className="mt-1.5 text-xs leading-relaxed text-fg-muted">
          Enter the full account number again. It is encrypted immediately and only the last four digits are retained for display.
        </p>
        <form onSubmit={savePayout} className="mt-5 space-y-3">
          <div>
            <label className="label" htmlFor="payout-holder">Account holder</label>
            <input id="payout-holder" required minLength={2} maxLength={80} value={form.accountHolder} onChange={(event) => setForm({ ...form, accountHolder: event.target.value })} className="input" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="payout-account">Account number</label>
              <input id="payout-account" required inputMode="numeric" pattern="\d{9,18}" value={form.accountNumber} onChange={(event) => setForm({ ...form, accountNumber: event.target.value.replace(/\D/g, "").slice(0, 18) })} className="input font-mono" placeholder="Enter full account number" />
            </div>
            <div>
              <label className="label" htmlFor="payout-confirm">Confirm account number</label>
              <input id="payout-confirm" required inputMode="numeric" pattern="\d{9,18}" value={form.confirmAccountNumber} onChange={(event) => setForm({ ...form, confirmAccountNumber: event.target.value.replace(/\D/g, "").slice(0, 18) })} className="input font-mono" placeholder="Re-enter account number" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="payout-bank">Bank name</label>
              <input id="payout-bank" required minLength={2} maxLength={80} value={form.bankName} onChange={(event) => setForm({ ...form, bankName: event.target.value })} className="input" placeholder="e.g. HDFC Bank" />
            </div>
            <div>
              <label className="label" htmlFor="payout-ifsc">IFSC code</label>
              <input id="payout-ifsc" required maxLength={11} value={form.ifsc} onChange={(event) => setForm({ ...form, ifsc: event.target.value.toUpperCase() })} className="input font-mono uppercase" placeholder="HDFC0001234" />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="payout-upi">UPI ID <span className="normal-case tracking-normal text-fg-subtle">(optional)</span></label>
            <input id="payout-upi" maxLength={80} value={form.upiId} onChange={(event) => setForm({ ...form, upiId: event.target.value })} className="input" placeholder="yourname@bank" />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setPayoutOpen(false)} className="btn-outline flex-1">Cancel</button>
            <button type="submit" disabled={savingPayout} className="btn-dark flex-1">
              {savingPayout ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />} Save securely
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
