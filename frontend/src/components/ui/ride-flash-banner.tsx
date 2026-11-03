"use client";

import { useEffect, useState } from "react";
import {
  Banknote,
  Check,
  Clock3,
  CreditCard,
  Loader2,
  Navigation,
  Phone,
  Route as RouteIcon,
  X,
} from "lucide-react";
import { inr } from "@rydex/shared/utils";
import { playNotificationSound } from "@/lib/sounds";
import type { RideRequestPayload } from "@/hooks/use-partner-socket";

interface RideFlashBannerProps {
  request: RideRequestPayload;
  onAccept: (bookingId: string) => Promise<void> | void;
  onReject: (bookingId: string) => void;
  onDismiss: () => void;
}

export default function RideFlashBanner({ request, onAccept, onReject, onDismiss }: RideFlashBannerProps) {
  const [accepting, setAccepting] = useState(false);
  const title = request.categoryLabel || request.vehicle?.name || "Ride request";
  const image = request.image || request.vehicle?.image;
  const awaitingPayment = request.paymentMethod === "online" && request.paymentStatus !== "paid";

  useEffect(() => {
    playNotificationSound();
  }, []);

  async function handleAccept() {
    setAccepting(true);
    try {
      await onAccept(request.bookingId);
    } finally {
      setAccepting(false);
    }
  }

  return (
    <div
      className="fixed inset-x-3 bottom-3 z-[100] mx-auto w-auto max-w-lg animate-slide-up sm:inset-x-auto sm:right-5 sm:bottom-5 sm:mx-0 sm:w-[26rem]"
      role="alert"
      aria-live="assertive"
    >
      <div className="overflow-hidden rounded-3xl border-2 border-warning bg-surface shadow-2xl">
        <div className="flex items-center justify-between gap-3 bg-warning/10 px-4 py-2.5">
          <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-warning">
            <span className="h-2 w-2 animate-pulse rounded-full bg-warning" />
            New ride request
          </span>
          <button
            type="button"
            onClick={onDismiss}
            className="grid h-7 w-7 place-items-center rounded-full text-fg-muted transition hover:bg-surface-muted hover:text-ink"
            aria-label="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-2xl bg-surface-muted">
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image} alt="" className="h-full w-full object-cover" />
              ) : (
                <Navigation className="h-5 w-5 text-fg-subtle" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{title}</p>
              <p className="truncate text-[11px] text-fg-muted">
                {request.rider.name}
                {request.vehicle?.registrationNumber
                  ? ` · ${request.vehicle.registrationNumber}`
                  : request.scheduled && request.date && request.time
                    ? ` · ${request.date} at ${request.time}`
                    : " · Ride now"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-extrabold">{inr(request.fare)}</p>
              <p className="text-[10px] font-semibold text-success">{inr(request.partnerEarning)} you earn</p>
            </div>
          </div>

          <div className="space-y-2 rounded-2xl bg-surface-muted/60 p-3">
            <div className="flex items-start gap-2.5">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-ink" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-fg-subtle">Pickup</p>
                <p className="mt-0.5 line-clamp-2 text-xs font-medium leading-relaxed">{request.pickup.address}</p>
              </div>
            </div>
            <div className="ml-[3px] h-3 border-l border-dashed border-line-strong" />
            <div className="flex items-start gap-2.5">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-lime ring-1 ring-ink/20" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-fg-subtle">Drop</p>
                <p className="mt-0.5 line-clamp-2 text-xs font-medium leading-relaxed">{request.drop.address}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-fg-muted">
            <span className="inline-flex items-center gap-1.5">
              <RouteIcon className="h-3.5 w-3.5" /> {request.distanceKm} km · {request.durationMin} min
            </span>
            <span className="inline-flex items-center gap-1.5">
              {request.paymentMethod === "online" ? (
                <CreditCard className="h-3.5 w-3.5" />
              ) : (
                <Banknote className="h-3.5 w-3.5" />
              )}
              {request.paymentMethod === "online" ? "Online payment" : "Cash after ride"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="h-3.5 w-3.5" /> Just now
            </span>
            {request.rider.phone && (
              <a href={`tel:${request.rider.phone}`} className="inline-flex items-center gap-1.5 font-semibold text-ink underline underline-offset-2">
                <Phone className="h-3.5 w-3.5" /> Call rider
              </a>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            {awaitingPayment ? (
              <p className="flex-1 rounded-xl bg-warning/5 px-3 py-2.5 text-[11px] leading-relaxed text-warning">
                Waiting for the rider&apos;s online payment before this ride can be accepted.
              </p>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onReject(request.bookingId)}
                  disabled={accepting}
                  className="btn-outline flex-1 text-danger"
                >
                  <X className="h-4 w-4" /> Decline
                </button>
                <button type="button" onClick={handleAccept} disabled={accepting} className="btn-dark flex-1">
                  {accepting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Accept
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}