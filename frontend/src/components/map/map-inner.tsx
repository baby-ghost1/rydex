"use client";

import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { cn } from "@rydex/shared/utils";
import { DEFAULT_MAP_CENTER } from "@rydex/shared/constants";

export interface MapPoint {
  lat: number;
  lng: number;
  label?: string;
  kind?: "pickup" | "drop" | "vehicle" | "partner";
}

export interface MapViewProps {
  points?: MapPoint[];
  route?: Array<[number, number]>;
  center?: [number, number];
  zoom?: number;
  className?: string;
  interactive?: boolean;
  onClick?: (lat: number, lng: number) => void;
  fit?: boolean;
}

function pin(kind: NonNullable<MapPoint["kind"]>, label?: string) {
  const color =
    kind === "pickup" ? "#0b0b0b" : kind === "drop" ? "#d8ff3e" : kind === "partner" ? "#1d9a6c" : "#e5484d";
  const textColor = kind === "drop" ? "#0b0b0b" : "#ffffff";
  return L.divIcon({
    className: "",
    html: `<div style="position:relative;display:flex;flex-direction:column;align-items:center">
      <div style="background:${color};color:${textColor};border:2px solid #fff;box-shadow:0 6px 18px rgba(0,0,0,.28);border-radius:999px;min-width:30px;height:30px;display:flex;align-items:center;justify-content:center;font:700 11px/1 Inter,Arial,sans-serif;padding:0 7px">${label || (kind === "pickup" ? "P" : kind === "drop" ? "D" : "•")}</div>
      <div style="width:2px;height:5px;background:${color}"></div>
    </div>`,
    iconSize: [30, 35],
    iconAnchor: [15, 35],
  });
}

function ClickHandler({ onClick }: { onClick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(event) {
      onClick?.(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

function Fitter({ points, route, fit }: { points: MapPoint[]; route: Array<[number, number]>; fit: boolean }) {
  const map = useMap();
  const didFit = useRef(false);
  useEffect(() => {
    // whenReady guarantees the map pane exists; retry safely afterwards.
    map.whenReady(() => {
      try {
        map.invalidateSize();
      } catch {
        // The map may be torn down already; not fatal.
      }
    });
  }, [map]);

  useEffect(() => {
    if (!fit || didFit.current) return;
    const coords: Array<[number, number]> = route.length
      ? route
      : points.map((p) => [p.lat, p.lng] as [number, number]);
    if (coords.length >= 2) {
      try {
        map.fitBounds(L.latLngBounds(coords as L.LatLngExpression[]), { padding: [42, 42], maxZoom: 15 });
        didFit.current = true;
      } catch {
        // Map not ready yet; we'll retry on the next render.
      }
    }
  }, [fit, map, points, route]);

  return null;
}

export default function MapInner({
  points = [],
  route = [],
  center,
  zoom = 13,
  className,
  interactive = true,
  onClick,
  fit = true,
}: MapViewProps) {
  const mapCenter = useMemo<[number, number]>(
    () =>
      center ||
      (points[0] ? [points[0].lat, points[0].lng] : DEFAULT_MAP_CENTER),
    [center, points],
  );

  return (
    <div className={cn("relative h-full w-full overflow-hidden", className)}>
      <MapContainer
        center={mapCenter}
        zoom={zoom}
        scrollWheelZoom={false}
        dragging={interactive}
        zoomControl={interactive}
        attributionControl
        zoomAnimation={false}
        markerZoomAnimation={false}
        fadeAnimation={false}
        style={{ height: "100%", width: "100%", minHeight: "inherit" }}
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
          className="rydex-map-tiles"
        />
        {route.length > 1 && (
          <>
            <Polyline positions={route} pathOptions={{ color: "#ffffff", weight: 8, opacity: 0.9 }} />
            <Polyline positions={route} pathOptions={{ color: "#0b0b0b", weight: 4, opacity: 0.95 }} />
          </>
        )}
        {points.map((point, index) => (
          <Marker
            key={point.kind || index}
            position={[point.lat, point.lng]}
            icon={pin(point.kind || "vehicle", point.label)}
          />
        ))}
        {onClick && <ClickHandler onClick={onClick} />}
        <Fitter points={points} route={route} fit={fit} />
      </MapContainer>
      <style jsx global>{`
        .leaflet-container { border-radius: inherit; }
        .rydex-map-tiles { filter: grayscale(0.85) contrast(0.96); }
      `}</style>
    </div>
  );
}
