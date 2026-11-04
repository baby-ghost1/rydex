"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  CreditCard,
  Loader2,
  MapPin,
  Navigation,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import MapView from "@/components/map/map-view";
import SearchWidget from "@/components/search-widget";
import Modal from "@/components/ui/modal";
import { useAppDispatch } from "@/redux/hooks";
import { openAuthModal } from "@/redux/uiSlice";
import { api, ClientApiError } from "@/lib/client-api";
import { formatLocalDate } from "@/lib/date";
import { CATEGORY_MAP } from "@rydex/shared/constants";
import { cn, inr } from "@rydex/shared/utils";
import type { Place } from "@/components/location-input";
import type { MapPoint } from "@/components/map/map-inner";
import type { RideOptionDTO, VehicleCategory } from "@rydex/shared/types";

export interface BookSearchProps {
  pickup: Place | null;
  drop: Place | null;
  scheduled: boolean;
  date: string;
  time: string;
}

export default function BookSearchClient({ initial }: { initial: BookSearchProps }) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { data: session } = useSession();
  const [options, setOptions] = useState<RideOptionDTO[]>([]);
  const [loading, setLoading] = useState(Boolean(initial.pickup && initial.drop));
  const [error, setError] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [requesting, setRequesting] = useState<VehicleCategory | "">("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "online">("cash");
  const [config, setConfig] = useState<{ razorpayEnabled: boolean } | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distanceKm: number; durationMin: number } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then(setConfig)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (config && !config.razorpayEnabled) setPaymentMethod("cash");
  }, [config]);

  useEffect(() => {
    if (!initial.pickup || !initial.drop) {
      setLoading(false);
      setOptions([]);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError("");

    const params = new URLSearchParams({
      lat: String(initial.pickup.lat),
      lng: String(initial.pickup.lng),
      dropLat: String(initial.drop.lat),
      dropLng: String(initial.drop.lng),
    });

    fetch(`/api/rides/options?${params.toString()}`, { signal: controller.signal })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not load ride options.");
        setOptions(data.options || []);
        setRouteInfo({ distanceKm: data.distanceKm, durationMin: data.durationMin });
      })
      .catch((err) => {
        if ((err as Error).name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Could not load ride options.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [initial.pickup, initial.drop, refreshKey]);

  const mapPoints = useMemo(() => {
    const points: MapPoint[] = [];
    if (initial.pickup) points.push({ ...initial.pickup, kind: "pickup", label: "P" });
    if (initial.drop) points.push({ ...initial.drop, kind: "drop", label: "D" });
    return points;
  }, [initial.pickup, initial.drop]);

  const partnerCount = options.reduce((sum, option) => sum + option.count, 0);

  async function requestRide(option: RideOptionDTO) {
    if (!initial.pickup || !initial.drop) return;
    if (!session?.user) {
      dispatch(openAuthModal("login"));
      return;
    }

    setRequesting(option.category);
    setError("");
    try {
      const data = await api<{ booking: { _id: string } }>("/api/bookings", {
        method: "POST",
        json: {
          category: option.category,
          pickup: initial.pickup,
          drop: initial.drop,
          scheduled: initial.scheduled,
          ...(initial.scheduled ? { date: initial.date, time: initial.time } : {}),
          paymentMethod,
        },
      });
      toast.success(
        paymentMethod === "online"
          ? "Booking created - complete the payment to notify nearby partners."
          : "Request sent - nearby partners are being notified.",
      );
      router.push(
        `/bookings/${data.booking._id}${paymentMethod === "online" ? "?payment=pending" : "?new=1"}`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not request this ride.";
      setError(message);
      toast.error(message);
      if (err instanceof ClientApiError && err.status === 409) {
        setRefreshKey((key) => key + 1);
      }
    } finally {
      setRequesting("");
    }
  }

  if (!initial.pickup || !initial.drop) {
    return (
      <div className="mx-auto max-w-4xl px-5 pb-20 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">Book a ride</p>
          <h1 className="type-h1 mt-3">Where are you headed?</h1>
          <p className="mt-3 text-sm leading-relaxed text-fg-muted">
            Add your pickup and drop. We&apos;ll show the ride categories available from online
            partners near you, with the fare before you request.
          </p>
        </div>

        <div className="mt-7">
          <SearchWidget />
        </div>

        {/* <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            { icon: MapPin, title: "Set pickup & drop", text: "No date or time needed for an immediate ride." },
            { icon: Sparkles, title: "Compare categories", text: "Bike, auto, car and more with upfront fares." },
            { icon: ShieldCheck, title: "First accept wins", text: "Nearby partners are notified together. No waiting on one." },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-line bg-surface p-4">
              <item.icon className="h-5 w-5 text-ink" aria-hidden="true" />
              <p className="mt-3 text-sm font-bold">{item.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-fg-muted">{item.text}</p>
            </div>
          ))}
        </div> */}

        <p className="mt-6 text-center text-xs text-fg-muted">
          Looking for a specific vehicle?{" "}
          <Link href="/fleet" className="font-semibold text-ink underline underline-offset-2">
            Browse the fleet
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-5 pb-20 text-fg sm:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">{initial.scheduled ? "Scheduled ride" : "Ride now"}</p>
          <h1 className="type-h1 mt-3">Choose your ride.</h1>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-fg-muted">
            <span className="inline-flex items-center gap-1.5">
              <Navigation className="h-3 w-3" aria-hidden="true" />
              {initial.pickup.address.split(",")[0]}
            </span>
            <ArrowRight className="h-3.5 w-3.5 text-fg-subtle" aria-hidden="true" />
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-lime ring-1 ring-ink/20" aria-hidden="true" />
              {initial.drop.address.split(",")[0]}
            </span>
            <span className="text-fg-subtle" aria-hidden="true">·</span>
            {initial.scheduled ? (
              <>
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                  {formatLocalDate(initial.date)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                  {initial.time}
                </span>
              </>
            ) : (
              <span className="inline-flex items-center gap-1.5 font-semibold text-success">
                <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                Leaving now
              </span>
            )}
            <button type="button" onClick={() => setEditOpen(true)} className="btn-outline min-h-11 px-4 text-xs">
              Modify search
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3">
            <div className="flex items-center gap-2 text-xs text-fg-muted">
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" aria-hidden="true" />
                {loading ? "Finding partners…" : `${partnerCount} online partner${partnerCount === 1 ? "" : "s"}`}
              </span>
              {routeInfo && (
                <>
                  <span className="text-fg-subtle">·</span>
                  <span>{routeInfo.distanceKm} km · {routeInfo.durationMin} min</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-fg-subtle">
              <span className="h-1.5 w-1.5 rounded-full bg-success" /> First accept wins
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-line bg-surface p-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs font-semibold text-fg-muted">Payment</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod("cash")}
                aria-pressed={paymentMethod === "cash"}
                className={cn(
                  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 text-xs font-semibold transition",
                  paymentMethod === "cash"
                    ? "border-ink bg-ink text-white"
                    : "border-line-strong bg-surface text-fg-muted hover:text-ink",
                )}
              >
                {paymentMethod === "cash" ? <Check className="h-3.5 w-3.5" /> : <Wallet className="h-3.5 w-3.5" />}
                Cash
              </button>
              <button
                type="button"
                disabled={!config?.razorpayEnabled}
                onClick={() => setPaymentMethod("online")}
                aria-pressed={paymentMethod === "online"}
                className={cn(
                  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
                  paymentMethod === "online"
                    ? "border-ink bg-ink text-white"
                    : "border-line-strong bg-surface text-fg-muted hover:text-ink",
                )}
              >
                {paymentMethod === "online" ? <Check className="h-3.5 w-3.5" /> : <CreditCard className="h-3.5 w-3.5" />}
                Pay online
              </button>
            </div>
          </div>

          {error && (
            <div role="alert" className="mt-4 rounded-2xl border border-danger/20 bg-danger/5 px-5 py-4 text-sm text-danger">
              {error}
            </div>
          )}

          <div className="mt-4 space-y-3" aria-busy={loading}>
            {loading &&
              Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="skeleton h-36 rounded-3xl" />
              ))}

            {!loading &&
              options.map((option) => {
                const meta = CATEGORY_MAP[option.category];
                if (!meta) return null;
                const busy = requesting === option.category;
                return (
                  <button
                    key={option.category}
                    type="button"
                    onClick={() => requestRide(option)}
                    disabled={Boolean(requesting)}
                    className="group flex w-full flex-col gap-4 rounded-3xl border border-line bg-surface p-4 text-left transition hover:border-line-strong hover:shadow-[0_14px_44px_rgba(0,0,0,0.08)] disabled:cursor-not-allowed disabled:opacity-70 sm:flex-row sm:items-center"
                  >
                    <div className="relative h-24 w-full shrink-0 overflow-hidden rounded-2xl bg-surface-muted sm:h-28 sm:w-32">
                      <Image
                        src={meta.image}
                        alt={meta.label}
                        fill
                        sizes="128px"
                        className="object-cover transition duration-500 group-hover:scale-105 motion-reduce:transform-none"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h2 className="text-lg font-extrabold tracking-tight">{meta.label}</h2>
                          <p className="mt-0.5 text-xs text-fg-muted">{meta.description}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-xl font-extrabold tracking-tight">{inr(option.fare.total)}</p>
                          <p className="text-[10px] text-fg-subtle">fixed fare</p>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-fg-muted">
                        <span className="inline-flex items-center gap-1.5 font-semibold text-success">
                          <span className="h-1.5 w-1.5 rounded-full bg-success" />
                          {option.count} partner{option.count === 1 ? "" : "s"} online
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Clock3 className="h-3.5 w-3.5" /> {option.etaMin} min away
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5" /> {meta.seats} seats
                        </span>
                      </div>
                    </div>

                    <span className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-full bg-ink px-5 text-xs font-semibold text-white transition group-hover:bg-lime group-hover:text-ink">
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
                      {busy ? "Requesting…" : "Request"}
                      {!busy && <ArrowRight className="h-3.5 w-3.5" />}
                    </span>
                  </button>
                );
              })}
          </div>

          {!loading && options.length === 0 && !error && (
            <div className="mt-4 rounded-3xl border border-dashed border-line-strong bg-surface-muted px-6 py-16 text-center">
              <MapPin className="mx-auto h-6 w-6 text-fg-subtle" aria-hidden="true" />
              <p className="font-display mt-3 text-lg font-bold">No online partners nearby right now</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-fg-muted">
                Nobody is online within their pickup radius for this route. Try again in a minute or
                adjust your pickup point.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <button type="button" onClick={() => setRefreshKey((key) => key + 1)} className="btn-dark">
                  <RefreshCw className="h-4 w-4" /> Refresh
                </button>
                <button type="button" onClick={() => setEditOpen(true)} className="btn-outline">
                  Change route
                </button>
              </div>
            </div>
          )}

          <p className="mt-4 text-[11px] leading-relaxed text-fg-subtle">
            The fare is fixed when you request. All eligible online partners in this category are
            notified at once - the first to accept is assigned to your ride.
            {paymentMethod === "online" ? " Nearby partners are notified only after your online payment is confirmed." : ""}
          </p>
        </div>

        <div className="hidden lg:block">
          <div className="sticky top-28 overflow-hidden rounded-3xl border border-line bg-surface p-2">
            <div className="h-[calc(100vh-10rem)] min-h-[420px] overflow-hidden rounded-2xl">
              <MapView points={mapPoints} fit />
            </div>
            <div className="flex items-center gap-4 px-3 py-2.5 text-xs text-fg-muted">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-ink" aria-hidden="true" />
                Pickup
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-lime ring-1 ring-ink/20" aria-hidden="true" />
                Drop
              </span>
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        labelledBy="edit-search-title"
        label="Change your route"
        className="max-w-3xl"
      >
        <div className="mb-4 pr-12">
          <p className="eyebrow">Update your trip</p>
          <h2 id="edit-search-title" className="font-display mt-1 text-2xl font-extrabold tracking-tight text-fg">
            Change your route
          </h2>
        </div>
        <SearchWidget />
      </Modal>
    </div>
  );
}
