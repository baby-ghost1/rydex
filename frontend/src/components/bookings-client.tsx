"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  PackageOpen,
  Plus,
  MapPin,
  Navigation,
  Route,
} from "lucide-react";
import StatusBadge from "@/components/status-badge";
import { useAppDispatch } from "@/redux/hooks";
import { openAuthModal } from "@/redux/uiSlice";
import { api } from "@/lib/client-api";
import { CATEGORY_MAP } from "@rydex/shared/constants";
import { formatDate, inr, cn, resolveBookingCode } from "@rydex/shared/utils";

interface BookingRow {
  _id: string;
  bookingCode?: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  category?: keyof typeof CATEGORY_MAP;
  date: string;
  time: string;
  createdAt: string;
  distanceKm: number;
  fare: { total: number };
  pickup: { address: string };
  drop: { address: string };
  vehicle?: { name: string; image: string; category: string };
  partner?: { name: string; partnerProfile?: { businessName?: string } };
}

const tabs = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "upcoming", label: "Upcoming" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

export default function BookingsClient() {
  const { status, data: session } = useSession();
  const dispatch = useAppDispatch();
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [error, setError] = useState("");

  useEffect(() => {
    if (status !== "authenticated") {
      if (status === "unauthenticated") setLoading(false);
      return;
    }
    let active = true;
    (async () => {
      try {
        const data = await api<{ bookings: BookingRow[] }>("/api/bookings?limit=50");
        if (active) setBookings(data.bookings || []);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Could not load bookings");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [status]);

  const filtered = useMemo(() => {
    if (tab === "all") return bookings;
    if (tab === "active")
      return bookings.filter((b) => ["accepted", "arrived", "started"].includes(b.status));
    if (tab === "upcoming") return bookings.filter((b) => b.status === "pending");
    if (tab === "completed") return bookings.filter((b) => b.status === "completed");
    return bookings.filter((b) => ["cancelled", "rejected"].includes(b.status));
  }, [bookings, tab]);

  const counts = useMemo(
    () => ({
      active: bookings.filter((b) => ["accepted", "arrived", "started"].includes(b.status)).length,
      completed: bookings.filter((b) => b.status === "completed").length,
      upcoming: bookings.filter((b) => b.status === "pending").length,
    }),
    [bookings],
  );

  if (status === "unauthenticated") {
    return (
      <div className="mx-auto max-w-lg px-5 py-20 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white shadow-sm">
          <PackageOpen className="h-6 w-6 text-fg-subtle" />
        </div>
        <h1 className="font-display mt-5 text-3xl font-extrabold tracking-tight">Your bookings live here</h1>
        <p className="mt-2 text-sm leading-relaxed text-fg-muted">
          Sign in to see current rides, upcoming pickups and completed trips.
        </p>
        <button type="button" onClick={() => dispatch(openAuthModal("login"))} className="btn-dark mt-6">
          Sign in to continue
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-5 pb-20 sm:px-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">My bookings</p>
          <h1 className="font-display mt-3 text-4xl font-extrabold tracking-[-0.04em] sm:text-5xl">
            Your rides.
          </h1>
          <p className="mt-2 text-sm text-fg-muted">
            {counts.active > 0 ? `${counts.active} ride${counts.active > 1 ? "s" : ""} active right now.` : "Track every pickup, drop and receipt in one place."}
          </p>
        </div>
        <Link href="/book" className="btn-dark self-start">
          <Plus className="h-4 w-4" /> Book a new ride
        </Link>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {[
          ["Active", counts.active, "On the road now"],
          ["Upcoming", counts.upcoming, "Waiting for a partner"],
          ["Completed", counts.completed, "Trips in the books"],
        ].map(([label, value, hint]) => (
          <div key={String(label)} className="rounded-2xl border border-line bg-white p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-fg-subtle">{label}</p>
            <p className="font-display mt-1 text-2xl font-extrabold">{value}</p>
            <p className="text-[10px] text-fg-subtle">{hint}</p>
          </div>
        ))}
      </div>

      <div
        role="group"
        aria-label="Filter bookings"
        className="no-scrollbar mt-7 flex gap-1 overflow-x-auto rounded-full border border-line bg-white p-1.5"
      >
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            aria-pressed={tab === item.key}
            className={cn(
              "inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-xs font-semibold transition",
              tab === item.key ? "bg-ink text-white" : "text-fg-muted hover:bg-surface-muted hover:text-ink",
            )}
          >
            {item.label}
            {item.key === "active" && counts.active > 0 && (
              <span className="ml-1.5 rounded-full bg-lime px-1.5 py-0.5 text-[10px] text-ink">{counts.active}</span>
            )}
          </button>
        ))}
      </div>

      {error && (
        <p
          role="alert"
          className="mt-6 rounded-2xl border border-danger/15 bg-danger/5 px-4 py-3 text-xs text-danger"
        >
          {error}
        </p>
      )}

      <div className="mt-5 space-y-3" aria-busy={loading}>
        <span className="sr-only" role="status" aria-live="polite">
          {loading
            ? "Loading your bookings."
            : `${filtered.length} booking${filtered.length === 1 ? "" : "s"} shown.`}
        </span>
        {loading &&
          Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="skeleton h-40 rounded-3xl bg-white" />
          ))}

        {!loading &&
          filtered.map((booking) => (
            <Link
              key={booking._id}
              href={`/bookings/${booking._id}`}
              className="group block rounded-3xl border border-line bg-white p-4 transition hover:border-line-strong hover:shadow-[0_14px_44px_rgba(0,0,0,0.07)] sm:p-5"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="relative h-32 w-full shrink-0 overflow-hidden rounded-2xl bg-surface-muted sm:h-24 sm:w-32">
                  {booking.vehicle?.image ? (
                    <Image src={booking.vehicle.image} alt={booking.vehicle.name} fill sizes="128px" className="object-cover" />
                  ) : (
                    <div className="grid h-full place-items-center"><Route className="h-6 w-6 text-fg-subtle" /></div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={booking.status} />
                    <span className="font-mono text-[10px] tracking-tight text-fg-subtle">
                      {resolveBookingCode(booking)}
                    </span>
                    {booking.paymentMethod === "online" && booking.paymentStatus !== "paid" && booking.status === "pending" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-warning">
                        <CreditCard className="h-3 w-3" /> Payment pending
                      </span>
                    )}
                  </div>
                  <h3 className="mt-2 text-base font-bold tracking-tight">
                    {booking.vehicle?.name ||
                      (booking.category ? `${CATEGORY_MAP[booking.category]?.label || "Ride"} request` : "Vehicle")}{" "}
                    <span className="font-normal text-fg-subtle">·</span>{" "}
                    <span className="text-sm font-medium text-fg-muted">
                      {booking.partner?.partnerProfile?.businessName ||
                        booking.partner?.name ||
                        (booking.status === "pending" ? "Finding a partner" : "")}
                    </span>
                  </h3>
                  <div className="mt-2 flex flex-col gap-1 text-[11px] text-fg-muted">
                    <span className="inline-flex items-center gap-1.5 truncate"><Navigation className="h-3 w-3 shrink-0" aria-hidden="true" /> {booking.pickup.address}</span>
                    <span className="inline-flex items-center gap-1.5 truncate"><MapPin className="h-3 w-3 shrink-0" aria-hidden="true" /> {booking.drop.address}</span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-row items-end justify-between gap-4 border-t border-line pt-3 sm:flex-col sm:border-t-0 sm:border-l sm:pl-5 sm:pt-0 sm:text-right">
                  <div>
                    <p className="text-[10px] text-fg-subtle">Total</p>
                    <p className="text-base font-extrabold">{inr(booking.fare.total)}</p>
                  </div>
                  <div className="text-right text-[10px] text-fg-subtle">
                    <p className="flex items-center gap-1 sm:justify-end"><CalendarDays className="h-3 w-3" /> {formatDate(booking.date)}</p>
                    <p className="mt-0.5 flex items-center gap-1 sm:justify-end"><Clock3 className="h-3 w-3" /> {booking.time}</p>
                  </div>
                  <span className="hidden items-center gap-1 rounded-full bg-ink px-3 py-1.5 text-[10px] font-semibold text-white transition group-hover:bg-lime group-hover:text-ink sm:inline-flex">
                    View ride <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
      </div>

      {!loading && filtered.length === 0 && (
        <div className="mt-8 rounded-3xl border border-dashed border-line bg-surface/60 px-6 py-20 text-center">
          <CheckCircle2 className="mx-auto h-7 w-7 text-fg-subtle" />
          <p className="font-display mt-3 text-xl font-bold">Nothing here yet</p>
          <p className="mt-1 text-sm text-fg-muted">
            {tab === "all" ? "Your first RYDEX ride is waiting to be booked." : "No bookings in this view."}
          </p>
          <Link href="/book" className="btn-dark mt-6">Find a vehicle</Link>
        </div>
      )}

      {session?.user.role === "partner" && (
        <div className="mt-8 flex flex-col items-start justify-between gap-4 rounded-3xl bg-ink p-6 text-white sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-semibold text-lime">Partner mode</p>
            <p className="font-display mt-1 text-lg font-bold">Looking for incoming ride requests?</p>
          </div>
          <Link href="/dashboard/partner/requests" className="btn-light">
            Open partner requests <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
