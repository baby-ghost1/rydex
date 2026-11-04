"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Banknote,
  Check,
  Clock3,
  CreditCard,
  Loader2,
  MapPin,
  Navigation,
  ShieldCheck,
  Star,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import LocationInput, { type Place } from "@/components/location-input";
import MapPicker from "@/components/map/map-picker";
import { api } from "@/lib/client-api";
import { localDateISO } from "@/lib/date";
import { calculateFare, estimateDistanceKm, estimateDuration } from "@rydex/shared/fare";
import { cn, inr } from "@rydex/shared/utils";
import { useAppDispatch } from "@/redux/hooks";
import { openAuthModal } from "@/redux/uiSlice";
import type { VehicleDTO } from "@rydex/shared/types";

interface InitialTrip {
  pickup: Place | null;
  drop: Place | null;
  date: string;
  time: string;
}

export default function CheckoutClient({
  vehicleId,
  initial,
}: {
  vehicleId: string;
  initial: InitialTrip;
}) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { data: session, status } = useSession();
  const [vehicle, setVehicle] = useState<VehicleDTO | null>(null);
  const [loadingVehicle, setLoadingVehicle] = useState(true);
  const [pickup, setPickup] = useState<Place | null>(initial.pickup);
  const [drop, setDrop] = useState<Place | null>(initial.drop);
  const [activeField, setActiveField] = useState<"pickup" | "drop">("pickup");
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time || "10:00");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "online">("cash");
  const [config, setConfig] = useState<{
    razorpayEnabled: boolean;
    googleEnabled: boolean;
    zegoEnabled: boolean;
    emailEnabled: boolean;
    cloudinaryEnabled: boolean;
    demoMode: boolean;
  } | null>(null);
  const [route, setRoute] = useState<{
    distanceKm: number;
    durationMin: number;
    geometry: Array<[number, number]>;
    estimated: boolean;
  } | null>(null);
  const [routing, setRouting] = useState(false);
  const [reverseLoading, setReverseLoading] = useState(false);
  const [agreed, setAgreed] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!date) setDate(localDateISO());
  }, [date]);

  useEffect(() => {
    fetch(`/api/vehicles/${vehicleId}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Vehicle not found");
        setVehicle(data.vehicle);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoadingVehicle(false));
    fetch("/api/config")
      .then((res) => res.json())
      .then(setConfig)
      .catch(() => {});
  }, [vehicleId]);

  useEffect(() => {
    if (config && !config.razorpayEnabled) setPaymentMethod("cash");
  }, [config]);

  useEffect(() => {
    if (!pickup || !drop) {
      setRoute(null);
      return;
    }
    const controller = new AbortController();
    setRouting(true);
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          fromLat: String(pickup.lat),
          fromLng: String(pickup.lng),
          toLat: String(drop.lat),
          toLng: String(drop.lng),
        });
        const res = await fetch(`/api/geo/route?${params.toString()}`, { signal: controller.signal });
        if (res.ok) {
          const data = await res.json();
          setRoute({
            distanceKm: data.distanceKm,
            durationMin: data.durationMin,
            geometry: data.geometry || [],
            estimated: false,
          });
        } else {
          throw new Error("route");
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        const distanceKm = estimateDistanceKm(pickup, drop);
        setRoute({
          distanceKm,
          durationMin: estimateDuration(distanceKm),
          geometry: [
            [pickup.lat, pickup.lng],
            [drop.lat, drop.lng],
          ],
          estimated: true,
        });
      } finally {
        setRouting(false);
      }
    }, 350);
    return () => {
      controller.abort();
      clearTimeout(timer);
      setRouting(false);
    };
  }, [pickup, drop]);

  const fare = useMemo(() => {
    if (!vehicle) return null;
    return calculateFare({
      distanceKm: route?.distanceKm || 0,
      durationMin: route?.durationMin || 0,
      baseFare: vehicle.baseFare,
      pricePerKm: vehicle.pricePerKm,
      pricePerHour: vehicle.pricePerHour,
      minimumFare: vehicle.minimumFare,
    });
  }, [vehicle, route]);

  const onMapPick = useCallback(
    async (lat: number, lng: number) => {
      setReverseLoading(true);
      let address = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      try {
        const res = await fetch(`/api/geo/reverse?lat=${lat}&lng=${lng}`);
        const data = await res.json();
        if (data.address) address = data.address;
      } catch {
        // Coordinates are still usable when reverse geocoding is offline.
      }
      const place = { address, lat, lng };
      if (activeField === "pickup") {
        setPickup(place);
        setActiveField("drop");
      } else {
        setDrop(place);
      }
      setReverseLoading(false);
    },
    [activeField],
  );

  function loadRazorpayScript(): Promise<boolean> {
    return new Promise((resolve) => {
      if (typeof window !== "undefined" && window.Razorpay) return resolve(true);
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  async function submit() {
    if (!session) {
      dispatch(openAuthModal("login"));
      toast.error("Sign in to confirm your booking.");
      return;
    }
    if (!vehicle) return;
    if (!pickup || !drop) {
      toast.error("Add both pickup and drop locations.");
      return;
    }
    if (!agreed) {
      toast.error("Please accept the booking terms.");
      return;
    }
    if (!route) {
      toast.error("Wait for the route estimate to finish.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const data = await api<{
        booking: { _id: string; fare: { total: number } };
      }>("/api/bookings", {
        method: "POST",
        json: {
          vehicleId,
          pickup,
          drop,
          date,
          time,
          distanceKm: route.distanceKm,
          durationMin: route.durationMin,
          paymentMethod,
          notes,
        },
      });
      const bookingId = data.booking._id;

      if (paymentMethod === "cash") {
        toast.success("Booking request sent to the partner");
        router.push(`/bookings/${bookingId}?new=1`);
        return;
      }

      const loaded = await loadRazorpayScript();
      if (!loaded) {
        toast.error("Could not load Razorpay. Your booking is saved - retry payment from the booking page.");
        router.push(`/bookings/${bookingId}?payment=pending`);
        return;
      }
      const orderData = await api<{
        order: { id: string; amount: number; currency: string; keyId: string; bookingId: string };
      }>("/api/payment/order", { method: "POST", json: { bookingId } });

      const options = {
        key: orderData.order.keyId,
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: "RYDEX Mobility",
        description: `${vehicle.name} · ${route.distanceKm} km`,
        order_id: orderData.order.id,
        prefill: {
          name: session.user.name || "",
          email: session.user.email || "",
          contact: session.user.phone || "",
        },
        theme: { color: "#0b0b0b" },
        notes: { bookingId },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            await api("/api/payment/verify", {
              method: "POST",
              json: { bookingId, ...response },
            });
            toast.success("Payment successful - request sent to the partner");
            router.push(`/bookings/${bookingId}?payment=success`);
          } catch (verifyError) {
            toast.error(verifyError instanceof Error ? verifyError.message : "Payment verification failed");
            router.push(`/bookings/${bookingId}?payment=pending`);
          }
        },
        modal: {
          ondismiss: () => {
            toast.info("Payment pending. You can complete it from your booking.");
            router.push(`/bookings/${bookingId}?payment=pending`);
          },
        },
      };
      const Razorpay = window.Razorpay!;
      const checkout = new Razorpay(options);
      checkout.on("payment.failed", () => {
        toast.error("Payment failed. Try another method or retry.");
      });
      checkout.open();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the booking.");
      setSubmitting(false);
    }
  }

  if (loadingVehicle) {
    return (
      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-10 sm:px-8 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-4">
          <div className="skeleton h-72 rounded-3xl" />
          <div className="skeleton h-36 rounded-3xl" />
        </div>
        <div className="skeleton h-96 rounded-3xl" />
      </div>
    );
  }
  if (!vehicle) {
    return (
      <div className="mx-auto max-w-lg px-5 py-24 text-center">
        <p className="font-display text-2xl font-bold">Vehicle unavailable</p>
        <p className="mt-2 text-sm text-fg-muted">{error || "This vehicle could not be loaded."}</p>
        <Link href="/book" className="btn-dark mt-6">Browse other vehicles</Link>
      </div>
    );
  }

  const owner = typeof vehicle.owner === "object" ? vehicle.owner : null;
  const total = fare?.total || 0;

  return (
    <div className="mx-auto max-w-7xl px-5 pb-24 text-fg sm:px-8">
      <Link href="/book" className="inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-fg-muted transition hover:text-fg">
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Back to search
      </Link>

      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Confirm your ride</p>
          <h1 className="type-h1 mt-2">
            {vehicle.name}
          </h1>
          <p className="mt-2 flex items-center gap-2 text-sm text-fg-muted">
            <Star className="h-3.5 w-3.5 fill-ink text-ink" aria-hidden="true" />
            {vehicle.rating ? vehicle.rating.toFixed(1) : "New"} · {vehicle.totalTrips} trips ·{" "}
            {owner?.name || owner?.partnerProfile?.businessName || "Verified partner"}
          </p>
        </div>
        <span className="inline-flex min-h-11 items-center gap-2 self-start rounded-full border border-line bg-surface px-4 text-xs font-semibold text-fg">
          <BadgeCheck className="h-3.5 w-3.5 text-success" aria-hidden="true" /> Verified vehicle
        </span>
      </div>

      <div className="mt-7 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-5">
          <section className="overflow-hidden rounded-3xl border border-line bg-surface text-fg">
            <div className="relative aspect-[16/7] sm:aspect-[16/6]">
              <Image
                src={vehicle.image}
                alt={vehicle.name}
                fill
                sizes="(max-width: 1024px) 100vw, 65vw"
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 flex flex-wrap gap-2 text-xs font-semibold text-white">
                <span className="rounded-full bg-surface-muted/80 px-2.5 py-1 backdrop-blur"><Users className="mr-1 inline h-3 w-3" aria-hidden="true" />{vehicle.seats} seats</span>
                <span className="rounded-full bg-surface-muted/80 px-2.5 py-1 capitalize backdrop-blur">{vehicle.transmission}</span>
                <span className="rounded-full bg-surface-muted/80 px-2.5 py-1 capitalize backdrop-blur">{vehicle.fuel}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 p-5">
              <div>
                <p className="text-sm font-semibold text-fg">{vehicle.brand} {vehicle.model}</p>
                <p className="mt-0.5 text-xs text-fg-muted">{vehicle.registrationNumber} · {vehicle.year}</p>
              </div>
              <p className="text-sm text-fg-muted">
                <span className="font-bold text-fg">{inr(vehicle.pricePerKm)}</span>/km · <span className="font-bold text-fg">{inr(vehicle.baseFare)}</span> base
              </p>
            </div>
          </section>

          <section className="rounded-3xl border border-line bg-surface p-5 text-fg sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-bold tracking-tight">Your trip</h2>
                <p className="mt-1 text-sm text-fg-muted">Set your pickup and destination.</p>
              </div>
              <div className="flex rounded-full bg-surface-muted p-1">
                {(["pickup", "drop"] as const).map((field) => (
                  <button
                    key={field}
                    type="button"
                    onClick={() => setActiveField(field)}
                    aria-pressed={activeField === field}
                    className={cn(
                      "min-h-11 rounded-full px-3 text-xs font-semibold capitalize transition",
                      activeField === field ? "bg-ink text-white shadow-sm" : "text-fg-muted hover:text-fg",
                    )}
                  >
                    {field}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <LocationInput
                value={pickup}
                onChange={setPickup}
                onFocus={() => setActiveField("pickup")}
                label="Pickup"
                placeholder="Where should we pick you up?"
                id="checkout-pickup"
              />
              <LocationInput
                value={drop}
                onChange={setDrop}
                onFocus={() => setActiveField("drop")}
                label="Drop"
                placeholder="Where are you going?"
                id="checkout-drop"
              />
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="checkout-date">Date</label>
                <input
                  id="checkout-date"
                  type="date"
                  aria-describedby={error ? "checkout-error" : undefined}
                  min={localDateISO()}
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="label" htmlFor="checkout-time">Time</label>
                <input
                  id="checkout-time"
                  type="time"
                  value={time}
                  onChange={(event) => setTime(event.target.value)}
                  className="input"
                />
              </div>
            </div>

            <div className="relative mt-5 overflow-hidden rounded-2xl">
              <MapPicker
                pickup={pickup}
                drop={drop}
                active={activeField}
                onPick={onMapPick}
                route={route?.geometry || []}
                height="h-64"
              />
              {reverseLoading && (
                <div className="absolute inset-0 z-20 grid place-items-center bg-ink/50 backdrop-blur-[1px]">
                  <span className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white shadow-lg">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> Finding address…
                  </span>
                </div>
              )}
            </div>

            <div className="mt-4">
              <label className="label" htmlFor="checkout-notes">Note for the partner (optional)</label>
              <textarea
                id="checkout-notes"
                rows={2}
                maxLength={300}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Gate number, luggage, accessibility needs…"
                className="input resize-none"
              />
            </div>
          </section>

          <section className="rounded-3xl border border-line bg-surface p-5 text-fg sm:p-6">
            <h2 className="font-display text-xl font-bold tracking-tight">Payment</h2>
            <p className="mt-1 text-sm text-fg-muted">Choose how you want to pay for this ride.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setPaymentMethod("cash")}
                aria-pressed={paymentMethod === "cash"}
                className={cn(
                  "flex min-h-11 items-start gap-3 rounded-2xl border p-4 text-left transition",
                  paymentMethod === "cash"
                    ? "border-ink bg-surface-muted ring-2 ring-ink/10"
                    : "border-line-strong hover:border-fg-subtle hover:bg-surface-muted",
                )}
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-muted"><Wallet className="h-4 w-4" aria-hidden="true" /></span>
                <span className="flex-1">
                  <span className="flex items-center justify-between gap-3 text-sm font-semibold text-fg">Cash <span className={cn("grid h-5 w-5 place-items-center rounded-full border", paymentMethod === "cash" ? "border-ink bg-ink text-white" : "border-line-strong")}>{paymentMethod === "cash" && <Check className="h-3 w-3" aria-hidden="true" />}</span></span>
                  <span className="mt-1 block text-xs leading-relaxed text-fg-muted">Pay your partner directly after the ride.</span>
                </span>
              </button>
              <button
                type="button"
                disabled={!config?.razorpayEnabled}
                onClick={() => setPaymentMethod("online")}
                aria-pressed={paymentMethod === "online"}
                className={cn(
                  "flex min-h-11 items-start gap-3 rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-55",
                  paymentMethod === "online"
                    ? "border-ink bg-surface-muted ring-2 ring-ink/10"
                    : "border-line-strong hover:border-fg-subtle hover:bg-surface-muted",
                )}
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-muted"><CreditCard className="h-4 w-4" aria-hidden="true" /></span>
                <span className="flex-1">
                  <span className="flex items-center justify-between gap-3 text-sm font-semibold text-fg">Pay online <span className={cn("grid h-5 w-5 place-items-center rounded-full border", paymentMethod === "online" ? "border-ink bg-ink text-white" : "border-line-strong")}>{paymentMethod === "online" && <Check className="h-3 w-3" aria-hidden="true" />}</span></span>
                  <span className="mt-1 block text-xs leading-relaxed text-fg-muted">
                    {config?.razorpayEnabled
                      ? "Secure UPI, card or netbanking via Razorpay."
                      : "Online payments are not configured on this deployment."}
                  </span>
                </span>
              </button>
            </div>
          </section>
        </div>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-3xl border border-line bg-surface p-5 text-fg sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold tracking-tight">Fare estimate</h2>
              {routing ? (
                <span className="inline-flex items-center gap-1 text-xs text-fg-subtle" role="status">
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> Routing
                </span>
              ) : (
                <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-fg-muted">
                  {route?.estimated ? "Approx." : "Live route"}
                </span>
              )}
            </div>

            <div className="mt-5 space-y-3 rounded-2xl bg-surface-muted p-4 text-sm">
              <div className="flex items-start gap-2.5">
                <Navigation className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">Pickup</p>
                  <p className="mt-0.5 line-clamp-2 leading-relaxed text-fg-muted">{pickup?.address || "Add a pickup location"}</p>
                </div>
              </div>
              <div className="ml-[3px] h-3 border-l border-dashed border-line-strong" aria-hidden="true" />
              <div className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">Drop</p>
                  <p className="mt-0.5 line-clamp-2 leading-relaxed text-fg-muted">{drop?.address || "Add a destination"}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl border border-line px-2 py-3">
                <MapPin className="mx-auto h-4 w-4 text-fg-subtle" aria-hidden="true" />
                <p className="mt-1 text-xs font-bold text-fg">{route ? `${route.distanceKm} km` : "-"}</p>
              </div>
              <div className="rounded-xl border border-line px-2 py-3">
                <Clock3 className="mx-auto h-4 w-4 text-fg-subtle" aria-hidden="true" />
                <p className="mt-1 text-xs font-bold text-fg">{route ? `${route.durationMin} min` : "-"}</p>
              </div>
              <div className="rounded-xl border border-line px-2 py-3">
                <BadgeCheck className="mx-auto h-4 w-4 text-fg-subtle" aria-hidden="true" />
                <p className="mt-1 text-xs font-bold text-fg">Insured</p>
              </div>
            </div>

            <div className="mt-5 space-y-2.5 text-sm text-fg-muted">
              <div className="flex justify-between gap-3"><span>Base fare</span><span className="font-medium text-fg">{inr(fare?.base || 0)}</span></div>
              <div className="flex justify-between gap-3"><span>Distance ({route?.distanceKm || 0} km × {inr(vehicle.pricePerKm)})</span><span className="font-medium text-fg">{inr(fare?.distance || 0)}</span></div>
              <div className="flex justify-between gap-3"><span>Time ({route?.durationMin || 0} min)</span><span className="font-medium text-fg">{inr(fare?.time || 0)}</span></div>
              {vehicle.minimumFare ? (
                <div className="flex justify-between gap-3 text-xs text-fg-subtle"><span>Minimum fare</span><span>{inr(vehicle.minimumFare)}</span></div>
              ) : null}
              <div className="flex justify-between gap-3 border-t border-line pt-3 text-base font-bold text-fg"><span>Estimated total</span><span>{inr(total)}</span></div>
            </div>

            <label className="mt-4 flex min-h-11 cursor-pointer items-start gap-2.5 text-xs leading-relaxed text-fg-muted">
              <input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-black" />
              <span>
                I agree to the <Link href="/terms" className="font-semibold text-fg underline">booking terms</Link> and understand the final fare may change if the route or waiting time changes.
              </span>
            </label>

            {error && (
              <p
                id="checkout-error"
                role="alert"
                className="mt-3 rounded-xl border border-danger/20 bg-danger/5 px-3 py-2 text-xs text-danger"
              >
                {error}
              </p>
            )}

            <button type="button" onClick={submit} disabled={submitting || !route} aria-busy={submitting} className="btn-dark mt-4 w-full py-3.5">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : status === "unauthenticated" ? <ShieldCheck className="h-4 w-4" aria-hidden="true" /> : <Banknote className="h-4 w-4" aria-hidden="true" />}
              {status === "unauthenticated" ? "Sign in to book" : submitting ? "Creating booking…" : `Request ride · ${inr(total)}`}
              {!submitting && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
            </button>

            <div className="mt-4 space-y-2 text-xs text-fg-subtle">
              <p className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-success" aria-hidden="true" /> OTP-verified pickup and drop</p>
              <p className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-success" aria-hidden="true" /> Free cancellation before the ride starts</p>
              <p className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-success" aria-hidden="true" /> Live tracking and in-app chat</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

