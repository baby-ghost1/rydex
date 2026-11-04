"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  ArrowRight,
  Bike,
  CarFront,
  CheckCircle2,
  Clock3,
  MapPin,
  Navigation,
  Package,
  Plus,
  ShieldCheck,
  Sparkles,
  Star,
  Truck,
} from "lucide-react";
import { PageHeader, SectionHeader, StatCard } from "@/components/dashboard/ui";
import StatusBadge from "@/components/status-badge";
import { CATEGORY_MAP, VEHICLE_CATEGORIES } from "@rydex/shared/constants";
import { api } from "@/lib/client-api";
import { formatDate, inr } from "@rydex/shared/utils";
import type { VehicleCategory } from "@rydex/shared/types";

interface Ride {
  _id: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  date: string;
  time: string;
  createdAt: string;
  distanceKm: number;
  fare: { total: number };
  pickup: { address: string };
  drop: { address: string };
  vehicle?: { name: string; image: string; category: VehicleCategory };
  partner?: { name: string; partnerProfile?: { businessName?: string } };
}

const quickCategories = VEHICLE_CATEGORIES.filter((category) =>
  ["car", "bike", "auto", "truck"].includes(category.value),
);

export default function RiderOverview() {
  const { data: session } = useSession();
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api<{ bookings: Ride[] }>("/api/bookings?limit=50")
      .then((data) => {
        if (active) setRides(data.bookings || []);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Could not load your rides.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const activeRide = useMemo(
    () => rides.find((ride) => ["accepted", "arrived", "started"].includes(ride.status)),
    [rides],
  );
  const pendingRides = rides.filter((ride) => ride.status === "pending");
  const completed = rides.filter((ride) => ride.status === "completed");
  const spent = completed.reduce((sum, ride) => sum + ride.fare.total, 0);
  const firstName = session?.user.name?.split(" ")[0] || "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`${greeting}, ${firstName}`}
        title={activeRide ? "Your ride is in motion." : pendingRides.length ? "A partner is reviewing your request." : "Where are you headed?"}
        description={
          activeRide
            ? "Track your partner live, chat, and keep your OTPs ready."
            : pendingRides.length
              ? "We'll notify you as soon as the partner accepts. You can follow the status from your bookings."
              : "Book a bike, car, auto, loading vehicle or truck from verified local partners."
        }
        actions={
          <>
            <Link href="/bookings" className="btn-outline">My bookings</Link>
            <Link href="/book" className="btn-dark"><Plus className="h-4 w-4" /> Book a ride</Link>
          </>
        }
      />

      {error && (
        <p className="rounded-2xl border border-danger/15 bg-danger/5 px-4 py-3 text-xs text-danger">{error}</p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active rides" value={loading ? "-" : activeRide ? 1 : 0} hint="Accepted or on the road" icon={MapPin} tone={activeRide ? "dark" : "light"} href="/bookings" />
        <StatCard label="Pending requests" value={loading ? "-" : pendingRides.length} hint="Awaiting partner response" icon={Clock3} />
        <StatCard label="Completed trips" value={loading ? "-" : completed.length} hint="All time with RYDEX" icon={CheckCircle2} />
        <StatCard label="Total spent" value={loading ? "-" : inr(spent)} hint="Across completed rides" icon={Package} tone="lime" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="space-y-5">
          {activeRide ? (
            <section className="overflow-hidden rounded-3xl border border-ink bg-ink text-white">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-lime">
                  <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-lime" /> Live ride
                </span>
                <StatusBadge status={activeRide.status} className="border-white/10 bg-surface/10 text-white" />
              </div>
              <div className="grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="min-w-0">
                  <div className="flex items-start gap-3">
                    <Navigation className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wider text-fg-inverse-subtle">Pickup</p>
                      <p className="truncate text-sm font-semibold">{activeRide.pickup.address.split(",").slice(0, 2).join(", ")}</p>
                    </div>
                  </div>
                  <div className="ml-[3px] my-2 h-4 border-l border-dashed border-white/25" />
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wider text-fg-inverse-subtle">Drop</p>
                      <p className="truncate text-sm font-semibold">{activeRide.drop.address.split(",").slice(0, 2).join(", ")}</p>
                    </div>
                  </div>
                  <p className="mt-4 text-[10px] text-fg-inverse-subtle">
                    {activeRide.vehicle?.name || "Your vehicle"} · {activeRide.partner?.name || activeRide.partner?.partnerProfile?.businessName || "Partner"}
                  </p>
                </div>
                <Link href={`/bookings/${activeRide._id}`} className="btn-lime w-full sm:w-auto">
                  Track ride <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </section>
          ) : pendingRides.length > 0 ? (
            <section className="rounded-3xl border border-warning/20 bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-warning">
                    <Clock3 className="h-3 w-3" /> Waiting for a partner
                  </p>
                  <p className="font-display mt-2 text-xl font-bold">{pendingRides[0].vehicle?.name || "Your ride"}</p>
                  <p className="mt-1 text-xs text-fg-muted">
                    <Navigation className="mr-1 inline-block h-3 w-3 align-middle" aria-hidden="true" />
                    {pendingRides[0].pickup.address.split(",")[0]} <MapPin className="mr-1 inline-block h-2.5 w-2.5 align-middle" aria-hidden="true" /> {pendingRides[0].drop.address.split(",")[0]} · {formatDate(pendingRides[0].date)} at {pendingRides[0].time}
                  </p>
                </div>
                <StatusBadge status="pending" />
              </div>
              <Link href={`/bookings/${pendingRides[0]._id}`} className="btn-dark mt-5">
                View request <ArrowRight className="h-4 w-4" />
              </Link>
            </section>
          ) : (
            <section className="relative overflow-hidden rounded-3xl border border-line bg-white p-6 sm:p-8">
              <div className="relative z-10 max-w-md">
                <p className="eyebrow">Ready when you are</p>
                <h2 className="font-display mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
                  One app. Every kind of ride.
                </h2>
                <p className="mt-2 text-xs leading-relaxed text-fg-muted">
                  From quick bike hops to moving an entire apartment - choose a verified vehicle and go.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {quickCategories.map((category) => (
                    <Link
                      key={category.value}
                      href={`/book?category=${category.value}`}
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line bg-white px-3.5 text-xs font-semibold transition hover:border-line-strong"
                    >
                      {category.label} <ArrowRight className="h-3 w-3" />
                    </Link>
                  ))}
                </div>
              </div>
              <div className="pointer-events-none absolute -bottom-10 -right-10 hidden h-56 w-56 overflow-hidden rounded-full sm:block">
                <Image src="/vehicles/car.jpg" alt="" fill sizes="224px" className="object-cover opacity-20" />
              </div>
            </section>
          )}

          <section>
            <SectionHeader title="Recent rides" description="Your latest bookings and receipts" href="/dashboard/user/bookings" />
            <div className="mt-3 space-y-2.5">
              {loading &&
                Array.from({ length: 2 }).map((_, index) => (
                  <div key={index} className="skeleton h-24 rounded-2xl bg-white" />
                ))}
              {!loading && rides.length === 0 && (
                <div className="rounded-2xl border border-dashed border-line bg-surface/60 p-8 text-center">
                  <Sparkles className="mx-auto h-5 w-5 text-fg-subtle" />
                  <p className="mt-2 text-sm font-semibold">No rides yet</p>
                  <p className="mt-1 text-xs text-fg-muted">Your booking history will appear here.</p>
                  <Link href="/book" className="btn-dark mt-4">Book your first ride</Link>
                </div>
              )}
              {!loading &&
                rides.slice(0, 4).map((ride) => (
                  <Link
                    key={ride._id}
                    href={`/bookings/${ride._id}`}
                    className="group flex items-center gap-3 rounded-2xl border border-line bg-white p-3 transition hover:border-line-strong hover:shadow-sm"
                  >
                    <div className="relative h-14 w-16 shrink-0 overflow-hidden rounded-xl bg-surface-muted">
                      {ride.vehicle?.image ? (
                        <Image src={ride.vehicle.image} alt="" fill sizes="64px" className="object-cover" />
                      ) : (
                        <div className="grid h-full place-items-center"><CarFront className="h-4 w-4 text-fg-subtle" /></div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-xs font-bold">{ride.vehicle?.name || "Vehicle"}</p>
                        <StatusBadge status={ride.status} dot={false} className="!px-2 !py-0.5 !text-[10px]" />
                      </div>
                      <p className="mt-1 truncate text-[10px] text-fg-muted">
                        <Navigation className="mr-1 inline-block h-2.5 w-2.5 align-middle" aria-hidden="true" />
                        {ride.pickup.address.split(",")[0]} <MapPin className="mr-1 inline-block h-2.5 w-2.5 align-middle" aria-hidden="true" /> {ride.drop.address.split(",")[0]}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-bold">{inr(ride.fare.total)}</p>
                      <p className="mt-0.5 text-[10px] text-fg-subtle">{formatDate(ride.date)}</p>
                    </div>
                  </Link>
                ))}
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <section className="rounded-3xl border border-line bg-white p-5">
            <p className="eyebrow">Quick book</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {VEHICLE_CATEGORIES.slice(0, 4).map((category) => (
                <Link
                  key={category.value}
                  href={`/book?category=${category.value}`}
                  className="group rounded-2xl border border-line p-3 transition hover:border-line-strong hover:bg-surface-muted/50"
                >
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-surface-muted group-hover:bg-white">
                    {category.value === "bike" ? <Bike className="h-3.5 w-3.5" /> : category.value === "truck" ? <Truck className="h-3.5 w-3.5" /> : <CarFront className="h-3.5 w-3.5" />}
                  </span>
                  <p className="mt-2 text-[11px] font-semibold">{category.label}</p>
                  <p className="text-[10px] text-fg-subtle">{CATEGORY_MAP[category.value]?.seats} seats</p>
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-line bg-white p-5">
            <p className="eyebrow">Safety first</p>
            <div className="mt-3 space-y-3 text-[11px] leading-relaxed text-fg-muted">
              <p className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" /> Every partner is document and video verified.</p>
              <p className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" /> Pickup and drop OTPs protect every ride.</p>
              <p className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" /> Share live location with family from the ride page.</p>
            </div>
          </section>

          <section className="rounded-3xl bg-lime p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-fg-muted">Have a vehicle?</p>
            <p className="font-display mt-1.5 text-lg font-extrabold tracking-tight">Turn it into income.</p>
            <p className="mt-1 text-[11px] leading-relaxed text-fg-muted">
              Keep 90% of every fare. Set your own prices and availability.
            </p>
            <Link href="/dashboard/partner" className="btn-dark mt-4 w-full">Explore partner mode</Link>
          </section>

          <section className="rounded-3xl border border-line bg-white p-5">
            <div className="flex items-center gap-2 text-xs font-bold"><Star className="h-4 w-4 fill-ink" /> Ride with confidence</div>
            <p className="mt-2 text-[11px] leading-relaxed text-fg-muted">
              Transparent fares, cash or online payment, and support that answers 24/7.
            </p>
            <a href="mailto:support@rydex.app" className="mt-3 inline-block text-[11px] font-semibold underline underline-offset-2">Contact support</a>
          </section>
        </div>
      </div>
    </div>
  );
}
