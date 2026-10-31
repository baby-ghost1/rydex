"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Loader2, LocateFixed, MapPin } from "lucide-react";
import { cn } from "@rydex/shared/utils";

export interface Place {
  address: string;
  lat: number;
  lng: number;
}

type GeoSearchResponse = {
  results?: Place[];
  error?: string;
};

type ReverseGeocodeResponse = {
  address?: string;
  error?: string;
};

export default function LocationInput({
  value,
  onChange,
  placeholder = "Search for a location",
  label,
  id,
  autoFocus,
  className,
  onFocus,
}: {
  value: Place | null;
  onChange: (place: Place | null) => void;
  placeholder?: string;
  label?: string;
  id?: string;
  autoFocus?: boolean;
  className?: string;
  onFocus?: () => void;
}) {
  const generatedId = useId();
  const inputId = id ?? `location-${generatedId}`;
  const listboxId = `${inputId}-listbox`;
  const errorId = `${inputId}-error`;

  const [query, setQuery] = useState(value?.address || "");
  const [results, setResults] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [error, setError] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!value?.address) return;

    setQuery((current) => (current === value.address ? current : value.address));
  }, [value?.address]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  useEffect(() => {
    const term = query.trim();

    if (!term || term.length < 2 || value?.address === query) {
      setResults([]);
      setLoading(false);
      setHasSearched(false);
      setActiveIndex(-1);
      return;
    }

    const controller = new AbortController();
    setLoading(false);
    setHasSearched(false);
    setActiveIndex(-1);

    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `/api/geo/search?q=${encodeURIComponent(term)}`,
          { signal: controller.signal },
        );
        const data = (await response
          .json()
          .catch(() => ({}))) as GeoSearchResponse;

        if (!response.ok) {
          throw new Error(data.error || "Search failed");
        }

        if (controller.signal.aborted) return;

        const places = Array.isArray(data.results) ? data.results : [];
        setResults(places);
        setActiveIndex(places.length ? 0 : -1);
        setHasSearched(true);
        setOpen(true);
      } catch (searchError) {
        if (
          controller.signal.aborted ||
          (searchError as Error).name === "AbortError"
        ) {
          return;
        }

        setResults([]);
        setActiveIndex(-1);
        setHasSearched(false);
        setOpen(false);
        setError("Could not search places. Please try again.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, value?.address]);

  function choose(place: Place) {
    setQuery(place.address);
    onChange(place);
    setResults([]);
    setActiveIndex(-1);
    setHasSearched(false);
    setOpen(false);
    setError("");
  }

  async function useCurrentLocation() {
    if (!navigator.geolocation) {
      setError("Your browser does not support location services.");
      return;
    }

    setLocating(true);
    setError("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        const fallbackAddress = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        let place: Place = { address: fallbackAddress, lat, lng };

        try {
          const response = await fetch(`/api/geo/reverse?lat=${lat}&lng=${lng}`);
          const data = (await response
            .json()
            .catch(() => ({}))) as ReverseGeocodeResponse;

          if (response.ok && data.address?.trim()) {
            place = { address: data.address.trim(), lat, lng };
          }
        } catch {
          // Coordinates remain a valid fallback when reverse geocoding fails.
        }

        setQuery(place.address);
        onChange(place);
        setResults([]);
        setActiveIndex(-1);
        setHasSearched(false);
        setOpen(false);
        setLocating(false);
      },
      (positionError) => {
        setError(
          positionError.code === positionError.PERMISSION_DENIED
            ? "Location permission denied. Search for a place instead."
            : "Could not get your location. Try searching instead.",
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 9000 },
    );
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Tab") {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (event.key === "Escape" && open) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (!results.length) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) =>
        current < 0 ? 0 : (current + 1) % results.length,
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) =>
        current <= 0 ? results.length - 1 : current - 1,
      );
      return;
    }

    if (event.key === "Home" && open) {
      event.preventDefault();
      setActiveIndex(0);
      return;
    }

    if (event.key === "End" && open) {
      event.preventDefault();
      setActiveIndex(results.length - 1);
      return;
    }

    if (event.key === "Enter" && open) {
      event.preventDefault();
      choose(results[activeIndex >= 0 ? activeIndex : 0]);
    }
  }

  const showPanel = open && (loading || results.length > 0 || hasSearched);
  const activeOption =
    showPanel && activeIndex >= 0 ? results[activeIndex] : undefined;

  const announcement = locating
    ? "Finding your current location."
    : loading
      ? "Searching for places."
      : showPanel && hasSearched
        ? results.length
          ? `${results.length} places found. Use the arrow keys to browse.`
          : "No places found."
        : "";

  return (
    <div className={cn("relative", className)} ref={wrapRef}>
      {label && (
        <label className="label" htmlFor={inputId}>
          {label}
        </label>
      )}

      <div className="relative">
        <MapPin
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle"
          aria-hidden="true"
        />

        <input
          ref={inputRef}
          id={inputId}
          className="input pl-10 pr-12"
          value={query}
          placeholder={placeholder}
          autoFocus={autoFocus}
          autoComplete="off"
          spellCheck={false}
          role="combobox"
          aria-label={label ? undefined : placeholder}
          aria-expanded={showPanel}
          aria-controls={showPanel ? listboxId : undefined}
          aria-autocomplete="list"
          aria-activedescendant={
            activeOption ? `${inputId}-option-${activeIndex}` : undefined
          }
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onFocus={() => {
            onFocus?.();
            if (results.length || hasSearched) setOpen(true);
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setResults([]);
            setActiveIndex(-1);
            setHasSearched(false);
            setError("");
            setOpen(true);
            if (value) onChange(null);
          }}
          onKeyDown={handleKeyDown}
        />

        <button
          type="button"
          onClick={useCurrentLocation}
          disabled={locating}
          aria-label={
            locating ? "Finding your current location" : "Use current location"
          }
          aria-busy={locating}
          className="absolute right-0.5 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full text-fg-subtle transition hover:bg-surface-muted hover:text-fg active:scale-95 disabled:cursor-wait disabled:opacity-60"
        >
          {locating ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <LocateFixed className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>

      <span className="sr-only" role="status" aria-live="polite">
        {announcement}
      </span>

      {showPanel && (
        <div className="absolute inset-x-0 top-[calc(100%+6px)] z-30 max-h-72 overflow-y-auto rounded-2xl border border-line bg-surface p-1.5 text-fg shadow-2xl">
          {loading && (
            <div className="flex min-h-11 items-center gap-2 px-3 py-2.5 text-sm text-fg-muted">
              <Loader2
                className="h-4 w-4 shrink-0 animate-spin"
                aria-hidden="true"
              />
              Finding places…
            </div>
          )}

          {!loading && hasSearched && results.length === 0 && (
            <p className="px-3 py-3 text-sm leading-relaxed text-fg-muted">
              No places found. Try a nearby landmark, area, or postcode.
            </p>
          )}

          <div
            id={listboxId}
            role="listbox"
            aria-label="Location suggestions"
            aria-busy={loading}
          >
            {results.map((place, index) => {
              const selected = index === activeIndex;

              return (
                <div
                  key={`${place.lat}-${place.lng}-${index}`}
                  id={`${inputId}-option-${index}`}
                  role="option"
                  aria-selected={selected}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(place)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={cn(
                    "flex min-h-11 cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition",
                    selected
                      ? "bg-surface-muted text-fg"
                      : "text-fg-muted hover:bg-surface-muted hover:text-fg",
                  )}
                >
                  <MapPin
                    className="mt-0.5 h-4 w-4 shrink-0 text-fg-subtle"
                    aria-hidden="true"
                  />
                  <span className="line-clamp-2 leading-relaxed">
                    {place.address}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
