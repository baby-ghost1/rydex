"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowUpDown,
  CalendarDays,
  Clock3,
  Loader2,
} from "lucide-react";
import LocationInput, { type Place } from "@/components/location-input";
import CategoryTabs from "@/components/category-tabs";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { setBookingDraft } from "@/redux/uiSlice";
import { isPastLocalDate, localDateISO } from "@/lib/date";
import { cn } from "@rydex/shared/utils";

type FieldErrors = Partial<
  Record<"pickup" | "drop" | "date" | "time", string>
>;

const fieldOrder = ["pickup", "drop", "date", "time"] as const;

const fieldIds: Record<(typeof fieldOrder)[number], string> = {
  pickup: "search-pickup",
  drop: "search-drop",
  date: "search-date",
  time: "search-time",
};

export default function SearchWidget({ className }: { className?: string }) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const draft = useAppSelector((state) => state.ui.bookingDraft);
  const [category, setCategory] = useState(draft.category || "car");
  const [pickup, setPickup] = useState<Place | null>(draft.pickup);
  const [drop, setDrop] = useState<Place | null>(draft.drop);
  const [date, setDate] = useState(draft.date || localDateISO());
  const [time, setTime] = useState(draft.time || "10:00");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  const today = localDateISO();

  useEffect(() => {
    if (draft.pickup) setPickup(draft.pickup);
    if (draft.drop) setDrop(draft.drop);
  }, [draft.pickup, draft.drop]);

  function clearError(field: keyof FieldErrors) {
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function swap() {
    setPickup(drop);
    setDrop(pickup);
    setErrors((current) => {
      const next = { ...current };
      delete next.pickup;
      delete next.drop;
      return next;
    });
  }

  function validate() {
    const next: FieldErrors = {};

    if (!pickup) {
      next.pickup = "Choose a pickup location from the suggestions.";
    }
    if (!drop) {
      next.drop = "Choose a destination from the suggestions.";
    }
    if (
      pickup &&
      drop &&
      pickup.lat === drop.lat &&
      pickup.lng === drop.lng
    ) {
      next.drop = "Pickup and drop cannot be the same place.";
    }
    if (!date) {
      next.date = "Choose a pickup date.";
    } else if (isPastLocalDate(date)) {
      next.date = "Choose today or a future date.";
    }
    if (!time) {
      next.time = "Choose a pickup time.";
    }

    setErrors(next);

    const firstInvalid = fieldOrder.find((field) => next[field]);
    if (firstInvalid) {
      window.requestAnimationFrame(() => {
        document.getElementById(fieldIds[firstInvalid])?.focus();
      });
    }

    return Object.keys(next).length === 0;
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!validate() || !pickup || !drop) return;

    setLoading(true);
    dispatch(
      setBookingDraft({
        category,
        pickup,
        drop,
        date,
        time,
      }),
    );

    const params = new URLSearchParams({
      category,
      pickup: pickup.address,
      pickupLat: String(pickup.lat),
      pickupLng: String(pickup.lng),
      drop: drop.address,
      dropLat: String(drop.lat),
      dropLng: String(drop.lng),
      date,
      time,
    });

    router.push(`/book?${params.toString()}`);
  }

  const errorList = fieldOrder
    .map((field) => errors[field])
    .filter((message): message is string => Boolean(message));

  return (
    <form
      noValidate
      onSubmit={submit}
      aria-busy={loading}
      className={cn(
        "surface-default rounded-[28px] border border-line p-3 shadow-[0_30px_90px_rgba(0,0,0,0.28)] sm:p-4",
        className,
      )}
    >
      <div className="border-b border-line px-1 pb-3 pt-1">
        <CategoryTabs value={category} onChange={setCategory} className="gap-1.5" />
      </div>

      {errorList.length > 0 && (
        <div
          id="search-errors"
          role="alert"
          className="mt-3 rounded-xl border border-danger/20 bg-danger/5 px-3.5 py-2.5 text-xs leading-relaxed text-danger"
        >
          <p className="font-semibold">Check your trip details</p>
          <ul className="mt-1 list-inside list-disc space-y-0.5">
            {errorList.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_2.75rem_minmax(0,1fr)] md:items-end">
        <div className="min-w-0">
          <LocationInput
            id="search-pickup"
            value={pickup}
            onChange={(place) => {
              setPickup(place);
              clearError("pickup");
              if (errors.drop === "Pickup and drop cannot be the same place.") {
                clearError("drop");
              }
            }}
            placeholder="Pickup location"
            label="From"
          />
        </div>

        <button
          type="button"
          onClick={swap}
          aria-label="Swap pickup and drop locations"
          className="icon-button justify-self-center border border-line bg-surface text-fg-muted hover:border-line-strong hover:text-fg md:mb-0 md:self-end"
        >
          <ArrowUpDown className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="min-w-0">
          <LocationInput
            id="search-drop"
            value={drop}
            onChange={(place) => {
              setDrop(place);
              clearError("drop");
              clearError("pickup");
            }}
            placeholder="Where are you going?"
            label="To"
          />
        </div>
      </div>

      <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
        <div>
          <label className="label" htmlFor="search-date">
            Date
          </label>
          <div className="relative">
            <CalendarDays
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle"
              aria-hidden="true"
            />
            <input
              id="search-date"
              type="date"
              min={today}
              value={date}
              onChange={(event) => {
                setDate(event.target.value);
                clearError("date");
              }}
              aria-invalid={errors.date ? true : undefined}
              aria-describedby={errors.date ? "search-date-error" : undefined}
              className="input pl-10"
            />
          </div>
          {errors.date && (
            <p id="search-date-error" className="mt-1.5 text-xs text-danger">
              {errors.date}
            </p>
          )}
        </div>

        <div>
          <label className="label" htmlFor="search-time">
            Time
          </label>
          <div className="relative">
            <Clock3
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle"
              aria-hidden="true"
            />
            <input
              id="search-time"
              type="time"
              value={time}
              onChange={(event) => {
                setTime(event.target.value);
                clearError("time");
              }}
              aria-invalid={errors.time ? true : undefined}
              aria-describedby={errors.time ? "search-time-error" : undefined}
              className="input pl-10"
            />
          </div>
          {errors.time && (
            <p id="search-time-error" className="mt-1.5 text-xs text-danger">
              {errors.time}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-dark w-full px-6 sm:col-span-2 lg:col-span-1 lg:w-auto"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          )}
          {loading ? "Finding rides…" : "Find a ride"}
        </button>
      </div>

      <span className="sr-only" role="status" aria-live="polite">
        {loading ? "Finding available vehicles for your route." : ""}
      </span>
    </form>
  );
}
