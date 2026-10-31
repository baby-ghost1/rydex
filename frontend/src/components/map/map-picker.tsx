"use client";

import { useState } from "react";
import { Loader2, MapPin, Navigation } from "lucide-react";
import MapView from "@/components/map/map-view";
import type { MapPoint } from "@/components/map/map-inner";
import { cn } from "@rydex/shared/utils";

export interface LatLng {
  lat: number;
  lng: number;
}

export default function MapPicker({
  pickup,
  drop,
  active,
  onPick,
  className,
  height = "h-72",
  route = [],
}: {
  pickup: LatLng | null;
  drop: LatLng | null;
  active: "pickup" | "drop";
  onPick: (lat: number, lng: number) => void;
  className?: string;
  height?: string;
  route?: Array<[number, number]>;
}) {
  const [locating, setLocating] = useState(false);
  const points: MapPoint[] = [];
  if (pickup) points.push({ ...pickup, kind: "pickup", label: "P" });
  if (drop) points.push({ ...drop, kind: "drop", label: "D" });

  const center = pickup
    ? ([pickup.lat, pickup.lng] as [number, number])
    : drop
      ? ([drop.lat, drop.lng] as [number, number])
      : undefined;

  function locate() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onPick(position.coords.latitude, position.coords.longitude);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  return (
    <div className={cn("relative overflow-hidden rounded-3xl border border-line", height, className)}>
      <MapView
        points={points}
        center={center}
        zoom={13}
        onClick={onPick}
        fit={points.length >= 2 && route.length === 0}
        route={route}
      />
      <div className="pointer-events-none absolute left-3 top-3 z-10 flex items-center gap-2 rounded-full bg-surface/95 px-3 py-2 text-[11px] font-semibold shadow-lg backdrop-blur">
        <MapPin className="h-3 w-3" />
        Tap the map to set your {active} point
      </div>
      <button
        type="button"
        onClick={locate}
        disabled={locating}
        className="absolute bottom-3 right-3 z-10 inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-3.5 text-xs font-semibold shadow-lg transition hover:bg-surface-muted disabled:cursor-wait disabled:opacity-60"
      >
        {locating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Navigation className="h-3 w-3" />}
        My location
      </button>
    </div>
  );
}
