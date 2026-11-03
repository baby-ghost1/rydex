"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  Check,
  CheckCircle2,
  CreditCard,
  Headphones,
  Loader2,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Printer,
  Radio,
  Route as RouteIcon,
  ShieldCheck,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import MapView from "@/components/map/map-view";
import type { MapPoint } from "@/components/map/map-inner";
import StatusBadge from "@/components/status-badge";
import ChatDrawer, { type ChatMessage } from "@/components/chat-drawer";
import OtpInput from "@/components/otp-input";
import RatingStars from "@/components/rating-stars";
import Modal from "@/components/ui/modal";
import { useBookingSocket, type LiveEvent } from "@/hooks/use-booking-socket";
import { api } from "@/lib/client-api";
import { CATEGORY_MAP } from "@rydex/shared/constants";
import { cn, formatDate, initials, inr, timeAgo } from "@rydex/shared/utils";
import type { BookingStatus, VehicleCategory } from "@rydex/shared/types";

interface RideUser {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  image?: string;
  partnerProfile?: { businessName?: string };
}

interface Ride {
  _id: string;
  status: BookingStatus;
  paymentMethod: "cash" | "online";
  paymentStatus: "pending" | "paid" | "refunded" | "failed";
  category: VehicleCategory;
  pickup: { address: string; lat: number; lng: number };
  drop: { address: string; lat: number; lng: number };
  date: string;
  time: string;
  scheduled?: boolean;
  distanceKm: number;
  durationMin: number;
  fare: { base: number; distance: number; time: number; total: number; partnerEarning: number; platformFee: number };
  vehicle: {
    _id: string;
    name: string;
    image: string;
    category: VehicleCategory;
    registrationNumber: string;
    brand: string;
    model: string;
  } | null;
  user: RideUser;
  partner: RideUser | null;
  notes?: string;
  review?: string;
  rating?: number;
  rejectionReason?: string;
  pickupOtp?: string;
  dropOtp?: string;
  otpVerified: { pickup: boolean; drop: boolean };
  messages: ChatMessage[];
  partnerLocation?: { lat: number; lng: number; updatedAt: string };
  createdAt: string;
  rideStartedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
}

const timeline = [
  { key: "pending", label: "Requested" },
  { key: "accepted", label: "Accepted" },
  { key: "arrived", label: "Arrived" },
  { key: "started", label: "On the way" },
  { key: "completed", label: "Completed" },
];
const order: Record<string, number> = {
  pending: 0,
  accepted: 1,
  arrived: 2,
  started: 3,
  completed: 4,
};

type LivePayload = {
  message?: ChatMessage;
  lat?: number;
  lng?: number;
  updatedAt?: string;
};

function livePayload(event: LiveEvent): LivePayload {
  if (!event.payload || typeof event.payload !== "object") return {};
  return event.payload as LivePayload;
}

export default function RideDetailClient({ bookingId }: { bookingId: string }) {
  const { data: session } = useSession();
  const [ride, setRide] = useState<Ride | null>(null);
  const [viewerRole, setViewerRole] = useState<"user" | "partner" | "admin">("user");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [routeGeometry, setRouteGeometry] = useState<Array<[number, number]>>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [ratingOpen, setRatingOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");
  const [pickupOtp, setPickupOtp] = useState("");
  const [dropOtp, setDropOtp] = useState("");
  const [actionLoading, setActionLoading] = useState("");
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState("");
  const [config, setConfig] = useState<{ razorpayEnabled: boolean } | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const lastLocationSent = useRef(0);

  const fetchRide = useCallback(async () => {
    try {
      const data = await api<{ booking: Ride; viewerRole: "user" | "partner" | "admin" }>(
        `/api/bookings/${bookingId}`,
      );
      setRide(data.booking);
      setViewerRole(data.viewerRole);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load this ride.");
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    fetchRide();
    fetch("/api/config")
      .then((res) => res.json())
      .then(setConfig)
      .catch(() => {});
  }, [fetchRide]);

  const { socket } = useBookingSocket(bookingId, (event) => {
    const payload = livePayload(event);
    if (event.event === "chat:message" && payload.message) {
      const message = payload.message;
      setRide((current) => {
        if (!current) return current;
        if (current.messages.some((item) => item._id === message._id)) return current;
        return { ...current, messages: [...current.messages, message] };
      });
    } else if (
      event.event === "booking:location" &&
      typeof payload.lat === "number" &&
      typeof payload.lng === "number"
    ) {
      setRide((current) =>
        current
          ? {
              ...current,
              partnerLocation: {
                lat: payload.lat as number,
                lng: payload.lng as number,
                updatedAt: payload.updatedAt || new Date().toISOString(),
              },
            }
          : current,
      );
    } else if (event.event === "booking:update") {
      fetchRide();
    }
  });

  useEffect(() => {
    if (!ride) return;
    if (!["pending", "accepted", "arrived", "started"].includes(ride.status)) return;
    const interval = setInterval(fetchRide, 20_000);
    return () => clearInterval(interval);
  }, [ride?.status, fetchRide]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!ride) return;
    let cancelled = false;
    const params = new URLSearchParams({
      fromLat: String(ride.pickup.lat),
      fromLng: String(ride.pickup.lng),
      toLat: String(ride.drop.lat),
      toLng: String(ride.drop.lng),
    });
    fetch(`/api/geo/route?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        setRouteGeometry(
          data?.geometry?.length
            ? data.geometry
            : [
                [ride.pickup.lat, ride.pickup.lng],
                [ride.drop.lat, ride.drop.lng],
              ],
        );
      })
      .catch(() => {
        if (!cancelled) {
          setRouteGeometry([
            [ride.pickup.lat, ride.pickup.lng],
            [ride.drop.lat, ride.drop.lng],
          ]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [ride?.pickup.lat, ride?.pickup.lng, ride?.drop.lat, ride?.drop.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  // Partner live-location sharing.
  useEffect(() => {
    if (!sharing) return;
    if (!navigator.geolocation) {
      setShareError("Geolocation is not supported in this browser.");
      setSharing(false);
      return;
    }
    setShareError("");
    const watch = navigator.geolocation.watchPosition(
      async (position) => {
        const now = Date.now();
        if (now - lastLocationSent.current < 7000) return;
        lastLocationSent.current = now;
        try {
          await api(`/api/bookings/${bookingId}/location`, {
            method: "POST",
            json: { lat: position.coords.latitude, lng: position.coords.longitude },
          });
        } catch (err) {
          setShareError(err instanceof Error ? err.message : "Could not share location.");
        }
      },
      (geoError) => {
        setShareError(geoError.message);
        setSharing(false);
      },
      { enableHighAccuracy: true, maximumAge: 5000 },
    );
    return () => navigator.geolocation.clearWatch(watch);
  }, [sharing, bookingId]);

  const mapPoints = useMemo(() => {
    if (!ride) return [];
    const points: MapPoint[] = [
      { ...ride.pickup, kind: "pickup" as const, label: "P" },
      { ...ride.drop, kind: "drop" as const, label: "D" },
    ];
    if (ride.partnerLocation && ["accepted", "arrived", "started"].includes(ride.status)) {
      points.push({
        lat: ride.partnerLocation.lat,
        lng: ride.partnerLocation.lng,
        kind: "partner" as const,
        label: "D",
      });
    }
    return points;
  }, [ride]);

  async function updateStatus(status: string, extra?: Record<string, unknown>) {
    setActionLoading(status);
    try {
      await api(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        json: { status, ...extra },
      });
      toast.success(
        status === "accepted"
          ? "Ride accepted"
          : status === "rejected"
            ? "Ride declined"
            : status === "arrived"
              ? "Rider notified that you've arrived"
              : status === "started"
                ? "Ride started"
                : status === "completed"
                  ? "Ride completed"
                  : status === "cancelled"
                    ? "Booking cancelled"
                    : "Ride updated",
      );
      setCancelOpen(false);
      setRejectOpen(false);
      setReason("");
      setPickupOtp("");
      setDropOtp("");
      await fetchRide();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update the ride.");
    } finally {
      setActionLoading("");
    }
  }

  async function submitRating() {
    setActionLoading("rating");
    try {
      await api(`/api/bookings/${bookingId}/rate`, {
        method: "POST",
        json: { rating, review },
      });
      toast.success("Thanks for rating your ride");
      setRatingOpen(false);
      await fetchRide();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit your rating.");
    } finally {
      setActionLoading("");
    }
  }

  function loadRazorpay(): Promise<boolean> {
    return new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  async function payNow() {
    if (!ride) return;
    setPaymentLoading(true);
    try {
      if (!config?.razorpayEnabled) {
        toast.error("Online payments are not configured on this deployment.");
        return;
      }
      const loaded = await loadRazorpay();
      if (!loaded) throw new Error("Could not load Razorpay.");
      const data = await api<{ order: { id: string; amount: number; currency: string; keyId: string } }>(
        "/api/payment/order",
        { method: "POST", json: { bookingId } },
      );
      const checkout = new window.Razorpay!({
        key: data.order.keyId,
        amount: data.order.amount,
        currency: data.order.currency,
        name: "RYDEX Mobility",
        description: `Payment for ${ride.vehicle?.name || "your ride"}`,
        order_id: data.order.id,
        prefill: {
          name: session?.user.name || "",
          email: session?.user.email || "",
          contact: session?.user.phone || "",
        },
        theme: { color: "#0b0b0b" },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            await api("/api/payment/verify", { method: "POST", json: { bookingId, ...response } });
            toast.success("Payment successful");
            await fetchRide();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Payment verification failed.");
          }
        },
        modal: { ondismiss: () => toast.info("Payment cancelled. You can retry anytime.") },
      });
      checkout.open();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start payment.");
    } finally {
      setPaymentLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
        <div className="skeleton h-8 w-40 rounded-full" />
        <div className="mt-5 grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="space-y-5">
            <div className="skeleton h-80 rounded-3xl" />
            <div className="skeleton h-48 rounded-3xl" />
          </div>
          <div className="skeleton h-96 rounded-3xl" />
        </div>
      </div>
    );
  }

  if (!ride) {
    return (
      <div className="mx-auto max-w-lg px-5 py-24 text-center">
        <AlertTriangle className="mx-auto h-7 w-7 text-fg-subtle" />
        <p className="font-display mt-3 text-2xl font-bold">Ride not found</p>
        <p className="mt-2 text-sm text-fg-muted">{error || "You may not have access to this booking."}</p>
        <Link href="/bookings" className="btn-dark mt-6">Back to bookings</Link>
      </div>
    );
  }

  const isRider = viewerRole === "user";
  const isPartner = viewerRole === "partner";
  const riderWaiting = isRider && ride.status === "pending";
  const paymentPending =
    riderWaiting && ride.paymentMethod === "online" && ride.paymentStatus !== "paid";
  const counterpart = isRider ? ride.partner : ride.user;
  const counterpartName =
    counterpart?.partnerProfile?.businessName || counterpart?.name || "RYDEX partner";
  const active = ["accepted", "arrived", "started"].includes(ride.status);
  const canChat = Boolean(ride.partner) && !["cancelled", "rejected"].includes(ride.status);
  const currentStep = order[ride.status] ?? 0;
  const isTerminalBad = ["rejected", "cancelled"].includes(ride.status);

  return (
    <div className="mx-auto max-w-7xl px-5 pb-20 sm:px-8 print:max-w-none">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={isPartner ? "/dashboard/partner/rides" : "/bookings"}
          className="inline-flex items-center gap-2 text-xs font-semibold text-fg-muted transition hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> {isPartner ? "Partner rides" : "My bookings"}
        </Link>
        <div className="flex items-center gap-2">
          {socket?.connected && !isTerminalBad && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-success">
              <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-success" /> Live
            </span>
          )}
          <StatusBadge status={ride.status} />
        </div>
      </div>

      <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">
            {paymentPending
              ? "Payment pending"
              : riderWaiting
                ? "Finding a partner"
                : isPartner
                  ? ride.status === "pending"
                    ? "Incoming request"
                    : "Manage this ride"
                  : ride.status === "completed"
                    ? "Ride receipt"
                    : "Your ride"}
          </p>
          <h1 className="font-display mt-2 text-4xl font-extrabold tracking-[-0.04em] sm:text-5xl">
            {paymentPending
              ? "Complete your payment."
              : riderWaiting
                ? "Finding a partner…"
                : ride.status === "completed"
                  ? "Ride completed."
                  : ride.status === "cancelled"
                    ? "Booking cancelled."
                    : ride.status === "rejected"
                      ? "Request declined."
                      : isPartner
                        ? counterpart?.name || "Ride request"
                        : `${ride.vehicle?.name || "Your ride"}.`}
          </h1>
          <p className="mt-2 text-xs text-fg-muted">
            Booking #{ride._id.slice(-8).toUpperCase()} · {formatDate(ride.createdAt, true)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canChat && (
            <button type="button" onClick={() => setChatOpen(true)} className="btn-outline !py-2.5">
              <MessageCircle className="h-4 w-4" /> Chat
            </button>
          )}
          {counterpart?.phone && (
            <a href={`tel:${counterpart.phone}`} className="btn-dark !py-2.5">
              <Phone className="h-4 w-4" /> Call
            </a>
          )}
        </div>
      </div>

      {isTerminalBad && (
        <div className="mt-5 rounded-2xl border border-danger/15 bg-danger/5 px-4 py-3 text-xs text-danger">
          {ride.status === "rejected"
            ? `The partner declined this request${ride.rejectionReason ? `: ${ride.rejectionReason}` : "."}`
            : "This booking was cancelled. Any eligible online payment is refunded to the original method."}
          <Link href="/book" className="ml-2 font-semibold underline">Book another ride</Link>
        </div>
      )}

      {ride.paymentMethod === "online" && ride.paymentStatus === "pending" && ride.status === "pending" && (
        <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-warning/20 bg-warning/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-warning">
            Payment is pending. The partner can only accept this ride after your online payment is confirmed.
          </p>
          <button type="button" onClick={payNow} disabled={paymentLoading} className="btn-dark shrink-0 !bg-warning !py-2.5 !text-white">
            {paymentLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />} Pay now
          </button>
        </div>
      )}

      {riderWaiting && (
        <section className="mt-5 overflow-hidden rounded-3xl border border-line bg-white p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-full bg-lime/20 text-ink">
              <span className="absolute inset-0 animate-ping rounded-full bg-lime/30 motion-reduce:animate-none" />
              <Navigation className="relative h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg font-bold tracking-tight">
                {paymentPending
                  ? "Pay to start finding a partner"
                  : `Notifying ${CATEGORY_MAP[ride.category]?.label || "ride"} partners nearby`}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-fg-muted">
                {paymentPending
                  ? "Complete your online payment above. Nearby partners in this category are notified only after the payment is confirmed."
                  : "Every eligible online partner in this category has been alerted. The first one to accept gets your ride — we'll show their details here instantly."}
              </p>
            </div>
            <span className="hidden shrink-0 rounded-full bg-surface-muted px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-fg-muted sm:inline-flex">
              {inr(ride.fare.total)} fixed
            </span>
          </div>
        </section>
      )}

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-5">
          <section className="relative overflow-hidden rounded-3xl border border-line bg-white p-2">
            <div className="relative h-[320px] overflow-hidden rounded-2xl sm:h-[380px]">
              <MapView points={mapPoints} route={routeGeometry} fit />
              <div className="pointer-events-none absolute left-3 top-3 z-10 flex items-center gap-2 rounded-full bg-surface/95 px-3 py-2 text-[10px] font-semibold shadow-lg backdrop-blur">
                <Navigation className="h-3 w-3" />
                {ride.status === "started" ? "On the way to your drop" : active ? "Partner on the move" : "Your route"}
              </div>
              {ride.status === "started" && (
                <div className="pointer-events-none absolute inset-x-3 bottom-3 z-10 flex items-center justify-between rounded-2xl bg-surface-muted/85 px-4 py-3 text-white backdrop-blur">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-fg-inverse-subtle">Arriving at drop</p>
                    <p className="text-sm font-semibold">{ride.drop.address.split(",")[0]}</p>
                  </div>
                  <p className="text-xs font-bold text-lime">{ride.partnerLocation ? timeAgo(ride.partnerLocation.updatedAt) : "Waiting for GPS"}</p>
                </div>
              )}
            </div>
          </section>

          {!isTerminalBad && (
            <section className="rounded-3xl border border-line bg-white p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-bold tracking-tight">Ride progress</h2>
                <span className="text-[10px] text-fg-subtle">{ride.status === "completed" ? "All done" : "Live updates"}</span>
              </div>
              <div className="mt-5 flex items-center">
                {timeline.map((step, index) => {
                  const done = currentStep >= index;
                  return (
                    <div key={step.key} className="flex flex-1 items-center last:flex-none">
                      <div className="flex flex-col items-center">
                        <span
                          className={cn(
                            "grid h-7 w-7 place-items-center rounded-full border text-[10px] font-bold transition",
                            done ? "border-ink bg-ink text-white" : "border-line bg-white text-fg-subtle",
                          )}
                        >
                          {done ? <Check className="h-3.5 w-3.5" /> : index + 1}
                        </span>
                        <span className={cn("mt-2 hidden text-[10px] font-semibold sm:block", done ? "text-ink" : "text-fg-subtle")}>
                          {step.label}
                        </span>
                      </div>
                      {index < timeline.length - 1 && (
                        <div className={cn("mx-1 h-px flex-1 sm:mx-2", currentStep > index ? "bg-ink" : "bg-surface-muted/10")} />
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-4 text-[10px] text-fg-muted">
                <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3 w-3" /> {ride.scheduled ? `${formatDate(ride.date)} at ${ride.time}` : "Ride now"}</span>
                <span className="inline-flex items-center gap-1.5"><RouteIcon className="h-3 w-3" /> {ride.distanceKm} km · {ride.durationMin} min</span>
                {ride.otpVerified.pickup && <span className="inline-flex items-center gap-1.5 text-success"><BadgeCheck className="h-3 w-3" /> Pickup OTP verified</span>}
                {ride.otpVerified.drop && <span className="inline-flex items-center gap-1.5 text-success"><BadgeCheck className="h-3 w-3" /> Drop OTP verified</span>}
              </div>
            </section>
          )}

          <section className="rounded-3xl border border-line bg-white p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold tracking-tight">Trip details</h2>
              {ride.vehicle ? (
                <Link href={`/book/${ride.vehicle._id}`} className="text-[10px] font-semibold text-fg-muted underline underline-offset-2 hover:text-ink">
                  View vehicle
                </Link>
              ) : (
                <span className="rounded-full bg-surface-muted px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-fg-muted">
                  {CATEGORY_MAP[ride.category]?.label || ride.category}
                </span>
              )}
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-surface-muted/70 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-fg-subtle">Pickup</p>
                <p className="mt-1.5 flex items-start gap-2 text-xs leading-relaxed text-fg">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-ink" /> {ride.pickup.address}
                </p>
              </div>
              <div className="rounded-2xl bg-surface-muted/70 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-fg-subtle">Drop</p>
                <p className="mt-1.5 flex items-start gap-2 text-xs leading-relaxed text-fg">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-lime ring-1 ring-ink/20" /> {ride.drop.address}
                </p>
              </div>
            </div>

            {ride.notes && (
              <div className="mt-3 rounded-2xl border border-line px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-fg-subtle">Rider&apos;s note</p>
                <p className="mt-1 text-xs text-fg-muted">{ride.notes}</p>
              </div>
            )}

            {ride.vehicle && (
              <div className="mt-4 flex items-center gap-4 border-t border-line pt-4">
                <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-xl">
                  <Image src={ride.vehicle.image} alt={ride.vehicle.name} fill sizes="80px" className="object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{ride.vehicle.name}</p>
                  <p className="text-[10px] text-fg-muted">{ride.vehicle.brand} {ride.vehicle.model} · {ride.vehicle.registrationNumber}</p>
                </div>
                <span className="rounded-full bg-surface-muted px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-fg-muted">{ride.category}</span>
              </div>
            )}
          </section>

          {isRider && ride.status === "completed" && (
            <section className="rounded-3xl border border-line bg-white p-5 sm:p-6">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <h2 className="font-display text-lg font-bold tracking-tight">How was your ride?</h2>
                  <p className="mt-1 text-xs text-fg-muted">Your feedback helps other riders and partners.</p>
                </div>
                {ride.rating ? (
                  <div className="flex items-center gap-2">
                    <RatingStars value={ride.rating} size="sm" />
                    <span className="text-xs font-semibold">{ride.rating}.0</span>
                  </div>
                ) : (
                  <button type="button" onClick={() => setRatingOpen(true)} className="btn-dark !py-2.5">
                    <Star className="h-4 w-4" /> Rate this ride
                  </button>
                )}
              </div>
              {ride.rating && ride.review && (
                <p className="mt-4 rounded-2xl bg-surface-muted/70 px-4 py-3 text-xs leading-relaxed text-fg-muted">“{ride.review}”</p>
              )}
            </section>
          )}

          {isRider && !["cancelled", "completed", "rejected"].includes(ride.status) && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-line bg-white px-5 py-4">
              <div>
                <p className="text-xs font-semibold">Need to cancel?</p>
                <p className="mt-0.5 text-[10px] text-fg-muted">
                  {ride.status === "started" ? "A started ride can't be cancelled here." : "Free cancellation before the ride starts."}
                </p>
              </div>
              <button
                type="button"
                disabled={ride.status === "started"}
                onClick={() => setCancelOpen(true)}
                className="inline-flex min-h-11 items-center rounded-full border border-danger/20 px-4 text-xs font-semibold text-danger transition hover:bg-danger/5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Cancel booking
              </button>
            </div>
          )}

          {isPartner && counterpart && (
            <PartnerControls
              ride={ride}
              counterpart={counterpart}
              pickupOtp={pickupOtp}
              setPickupOtp={setPickupOtp}
              dropOtp={dropOtp}
              setDropOtp={setDropOtp}
              actionLoading={actionLoading}
              onAccept={() => updateStatus("accepted")}
              onReject={() => setRejectOpen(true)}
              onArrived={() => updateStatus("arrived")}
              onStart={() => updateStatus("started", { otp: pickupOtp })}
              onComplete={() => updateStatus("completed", { otp: dropOtp })}
              sharing={sharing}
              setSharing={setSharing}
              shareError={shareError}
              onChat={() => setChatOpen(true)}
            />
          )}

          {ride.status === "completed" && <div className="no-print flex justify-end"><button type="button" onClick={() => window.print()} className="btn-outline !py-2.5"><Printer className="h-4 w-4" /> Print receipt</button></div>}
        </div>

        <aside className="space-y-5 lg:sticky lg:top-28 lg:self-start">
          <section className="rounded-3xl border border-line bg-white p-5 sm:p-6">
            <h2 className="font-display text-lg font-bold tracking-tight">Fare summary</h2>
            <div className="mt-4 space-y-2.5 text-xs text-fg-muted">
              <div className="flex justify-between"><span>Base fare</span><span className="font-medium text-ink">{inr(ride.fare.base)}</span></div>
              <div className="flex justify-between"><span>Distance · {ride.distanceKm} km</span><span className="font-medium text-ink">{inr(ride.fare.distance)}</span></div>
              <div className="flex justify-between"><span>Time · {ride.durationMin} min</span><span className="font-medium text-ink">{inr(ride.fare.time)}</span></div>
              <div className="flex justify-between border-t border-line pt-3 text-sm font-bold text-ink"><span>Total fare</span><span>{inr(ride.fare.total)}</span></div>
              <div className="flex justify-between text-[10px]"><span>Payment</span><span className={cn("font-semibold", ride.paymentStatus === "paid" ? "text-success" : ride.paymentStatus === "refunded" ? "text-fg-muted" : "text-warning")}>
                {ride.paymentMethod === "cash" ? "Cash" : "Online"} · {ride.paymentStatus}
              </span></div>
              {isPartner && <div className="flex justify-between border-t border-line pt-3 text-[11px]"><span>Your earnings (90%)</span><span className="font-bold text-success">{inr(ride.fare.partnerEarning)}</span></div>}
            </div>
          </section>

          {isRider && ["accepted", "arrived", "started", "completed"].includes(ride.status) && (
            <section className="rounded-3xl border border-line bg-ink p-5 text-white sm:p-6">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-lime" />
                <h2 className="font-display text-lg font-bold tracking-tight">Ride OTPs</h2>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-fg-inverse-subtle">
                These codes stay the same for this ride — no refresh needed. Share the pickup code
                when your partner arrives, and the drop code when you reach your destination.
              </p>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-white/10 bg-surface/5 p-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-fg-inverse-subtle">Pickup OTP</p>
                      <p className="mt-1 text-[11px] font-medium">{ride.otpVerified.pickup ? "Verified" : "Share when partner arrives"}</p>
                    </div>
                    {ride.otpVerified.pickup ? (
                      <CheckCircle2 className="h-5 w-5 text-lime" />
                    ) : (
                      <span className={cn("font-mono font-bold tracking-[0.3em] text-lime", ride.pickupOtp ? "text-xl" : "text-sm text-fg-inverse-subtle")}>
                        {ride.pickupOtp || "••••"}
                      </span>
                    )}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-surface/5 p-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-fg-inverse-subtle">Drop OTP</p>
                      <p className="mt-1 text-[11px] font-medium">
                        {ride.otpVerified.drop
                          ? "Verified"
                          : ride.status === "started" || ride.status === "completed"
                            ? "Share after reaching the drop"
                            : "Available when the ride starts"}
                      </p>
                    </div>
                    {ride.otpVerified.drop ? (
                      <CheckCircle2 className="h-5 w-5 text-lime" />
                    ) : ride.status === "started" && ride.dropOtp ? (
                      <span className="font-mono text-xl font-bold tracking-[0.3em] text-lime">{ride.dropOtp}</span>
                    ) : (
                      <span className="font-mono text-sm tracking-[0.3em] text-fg-inverse-subtle">••••</span>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {counterpart && (
            <section className="rounded-3xl border border-line bg-white p-5 sm:p-6">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-fg-subtle">{isRider ? "Your partner" : "Your rider"}</p>
              <div className="mt-3 flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center overflow-hidden rounded-full bg-surface-muted text-xs font-bold">
                  {counterpart.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={counterpart.image} alt="" className="h-full w-full object-cover" />
                  ) : (
                    initials(counterpartName)
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{counterpartName}</p>
                  <p className="text-[10px] text-fg-muted">{isRider ? "Verified partner" : "RYDEX rider"}</p>
                </div>
                <BadgeCheck className="ml-auto h-4 w-4 text-success" />
              </div>
              {counterpart.phone && (
                <p className="mt-3 flex items-center gap-2 text-[11px] text-fg-muted"><Phone className="h-3 w-3" /> {counterpart.phone}</p>
              )}
              <div className="mt-4 grid grid-cols-2 gap-2">
                {canChat && (
                  <button type="button" onClick={() => setChatOpen(true)} className="btn-outline !px-3 !py-2 text-[11px]">
                    <MessageCircle className="h-3.5 w-3.5" /> Message
                  </button>
                )}
                {counterpart.phone ? (
                  <a href={`tel:${counterpart.phone}`} className="btn-dark !px-3 !py-2 text-xs"><Phone className="h-3.5 w-3.5" aria-hidden="true" /> Call</a>
                ) : (
                  <span className="btn-outline pointer-events-none !px-3 !py-2 text-xs opacity-40"><Phone className="h-3.5 w-3.5" aria-hidden="true" /> No phone</span>
                )}
              </div>
            </section>
          )}

          <div className="rounded-3xl border border-line bg-white p-5 text-[11px] text-fg-muted">
            <p className="flex items-center gap-2 font-semibold text-ink"><Headphones className="h-4 w-4" /> RYDEX support</p>
            <p className="mt-2 leading-relaxed">Something not right with this ride? Our team is available 24/7.</p>
            <a href="mailto:support@rydex.app" className="mt-2 inline-flex min-h-11 items-center font-semibold text-ink underline underline-offset-2">Contact support</a>
          </div>
        </aside>
      </div>

      <ChatDrawer
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        bookingId={bookingId}
        counterpartName={counterpartName}
        messages={ride.messages}
        onMessageSent={(message) =>
          setRide((current) => {
            if (!current) return current;
            if (current.messages.some((existing) => existing._id === message._id)) return current;
            return { ...current, messages: [...current.messages, message] };
          })
        }
      />

      <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} labelledBy="cancel-title" className="max-w-sm">
        <div id="cancel-title" className="font-display text-2xl font-extrabold tracking-tight">Cancel this booking?</div>
        <p className="mt-2 text-sm leading-relaxed text-fg-muted">
          The partner will be notified. Eligible online payments are refunded to the original method.
        </p>
        <div className="mt-6 flex gap-2">
          <button type="button" onClick={() => setCancelOpen(false)} className="btn-outline flex-1">Keep booking</button>
          <button
            type="button"
            onClick={() => updateStatus("cancelled")}
            disabled={actionLoading === "cancelled"}
            className="btn flex-1 bg-danger text-white hover:bg-danger/90"
          >
            {actionLoading === "cancelled" ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Cancel ride
          </button>
        </div>
      </Modal>

      <Modal open={rejectOpen} onClose={() => setRejectOpen(false)} labelledBy="reject-title" className="max-w-sm">
        <div id="reject-title" className="font-display text-2xl font-extrabold tracking-tight">Decline this request?</div>
        <p className="mt-2 text-sm leading-relaxed text-fg-muted">Let the rider know why. This is shared with them.</p>
        <label htmlFor="reject-reason" className="sr-only">
          Reason for declining
        </label>
        <textarea
          id="reject-reason"
          rows={3}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="e.g. Vehicle unavailable at this time"
          className="input mt-4 resize-none"
          maxLength={300}
        />
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={() => setRejectOpen(false)} className="btn-outline flex-1">Back</button>
          <button
            type="button"
            onClick={() => updateStatus("rejected", { reason })}
            disabled={!reason.trim() || actionLoading === "rejected"}
            className="btn flex-1 bg-danger text-white hover:bg-danger/90"
          >
            {actionLoading === "rejected" && <Loader2 className="h-4 w-4 animate-spin" />} Decline
          </button>
        </div>
      </Modal>

      <Modal open={ratingOpen} onClose={() => setRatingOpen(false)} labelledBy="rating-title" className="max-w-md">
        <div id="rating-title" className="font-display text-2xl font-extrabold tracking-tight">Rate your ride</div>
        <p className="mt-2 text-sm text-fg-muted">How was your experience with {counterpartName}?</p>
        <div className="mt-5 flex justify-center"><RatingStars value={rating} onChange={setRating} size="lg" /></div>
        <label htmlFor="ride-review" className="sr-only">
          Your review
        </label>
        <textarea
          id="ride-review"
          rows={3}
          value={review}
          onChange={(event) => setReview(event.target.value)}
          placeholder="Anything you'd like to share? (optional)"
          className="input mt-4 resize-none"
          maxLength={500}
        />
        <button type="button" onClick={submitRating} disabled={actionLoading === "rating"} className="btn-dark mt-4 w-full">
          {actionLoading === "rating" && <Loader2 className="h-4 w-4 animate-spin" />} Submit rating
        </button>
      </Modal>
    </div>
  );
}

function PartnerControls({
  ride,
  counterpart,
  pickupOtp,
  setPickupOtp,
  dropOtp,
  setDropOtp,
  actionLoading,
  onAccept,
  onReject,
  onArrived,
  onStart,
  onComplete,
  sharing,
  setSharing,
  shareError,
  onChat,
}: {
  ride: Ride;
  counterpart: RideUser;
  pickupOtp: string;
  setPickupOtp: (value: string) => void;
  dropOtp: string;
  setDropOtp: (value: string) => void;
  actionLoading: string;
  onAccept: () => void;
  onReject: () => void;
  onArrived: () => void;
  onStart: () => void;
  onComplete: () => void;
  sharing: boolean;
  setSharing: (value: boolean) => void;
  shareError: string;
  onChat: () => void;
}) {
  const onlinePending = ride.paymentMethod === "online" && ride.paymentStatus !== "paid";
  return (
    <section className="rounded-3xl border border-line bg-white p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-bold tracking-tight">
            {ride.status === "pending" ? "Incoming request" : "Ride controls"}
          </h2>
          <p className="mt-1 text-[11px] text-fg-muted">
            {ride.status === "pending"
              ? onlinePending
                ? "Waiting for the rider's online payment before you can accept."
                : "Accept to confirm the pickup."
              : ride.status === "accepted"
                ? "Head to the pickup and mark yourself arrived."
                : ride.status === "arrived"
                  ? "Ask the rider for their 4-digit pickup OTP."
                  : ride.status === "started"
                    ? "Share live location and complete with the drop OTP."
                    : "This ride is complete."}
          </p>
        </div>
        <StatusBadge status={ride.status} />
      </div>

      {ride.status === "pending" && (
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={onAccept} disabled={onlinePending || actionLoading === "accepted"} className="btn-dark flex-1">
            {actionLoading === "accepted" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {onlinePending ? "Awaiting payment" : "Accept ride"}
          </button>
          <button type="button" onClick={onReject} className="btn-outline flex-1 text-danger">Decline</button>
        </div>
      )}

      {ride.status === "accepted" && (
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={onArrived} disabled={actionLoading === "arrived"} className="btn-dark flex-1">
            {actionLoading === "arrived" ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />} I&apos;ve arrived
          </button>
          <button type="button" onClick={onChat} className="btn-outline flex-1"><MessageCircle className="h-4 w-4" /> Message rider</button>
        </div>
      )}

      {["accepted", "arrived"].includes(ride.status) && (
        <div className="mt-4 rounded-2xl border border-line bg-surface-muted/50 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-fg-muted">Start with pickup OTP</p>
          <div className="mt-2 max-w-[220px]"><OtpInput label="Pickup OTP" length={4} value={pickupOtp} onChange={setPickupOtp} autoFocus={false} /></div>
          <button type="button" onClick={onStart} disabled={pickupOtp.length !== 4 || actionLoading === "started"} className="btn-dark mt-3 w-full">
            {actionLoading === "started" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />} Start ride
          </button>
          <p className="mt-2 text-[10px] text-fg-subtle">Ask {counterpart.name?.split(" ")[0]} for the code shown on their ride page.</p>
        </div>
      )}

      {ride.status === "started" && (
        <>
          <div className="mt-4 flex items-center justify-between rounded-2xl border border-line p-3.5">
            <div className="flex items-center gap-2.5">
              <Radio className={cn("h-4 w-4", sharing ? "animate-pulse text-success" : "text-fg-subtle")} />
              <div>
                <p className="text-[11px] font-semibold">Share live location</p>
                <p className="text-[10px] text-fg-subtle">{sharing ? "Sharing while this page is open" : "Rider sees your position on the map"}</p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={sharing}
              onClick={() => setSharing(!sharing)}
              className="-m-2 grid min-h-11 min-w-11 place-items-center rounded-full"
              aria-label="Share live location"
            >
              <span
                className={cn(
                  "relative block h-6 w-11 rounded-full transition",
                  sharing ? "bg-success" : "bg-surface-muted/20",
                )}
                aria-hidden="true"
              >
                <span
                  className={cn(
                    "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition",
                    sharing ? "left-[22px]" : "left-0.5",
                  )}
                />
              </span>
            </button>
          </div>
          {shareError && (
            <p role="alert" className="mt-2 text-xs text-danger">
              {shareError}
            </p>
          )}

          <div className="mt-4 rounded-2xl border border-line bg-surface-muted/50 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-fg-muted">Complete with drop OTP</p>
            <div className="mt-2 max-w-[220px]"><OtpInput label="Drop OTP" length={4} value={dropOtp} onChange={setDropOtp} autoFocus={false} /></div>
            <button type="button" onClick={onComplete} disabled={dropOtp.length !== 4 || actionLoading === "completed"} className="btn-dark mt-3 w-full">
              {actionLoading === "completed" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Complete ride
            </button>
          </div>
        </>
      )}

      {ride.status === "completed" && (
        <div className="mt-5 flex items-center justify-between rounded-2xl bg-success/5 p-4">
          <div>
            <p className="text-xs font-semibold text-success">Ride completed</p>
            <p className="mt-0.5 text-[10px] text-fg-muted">You earned {inr(ride.fare.partnerEarning)}</p>
          </div>
          <CheckCircle2 className="h-5 w-5 text-success" />
        </div>
      )}
    </section>
  );
}
