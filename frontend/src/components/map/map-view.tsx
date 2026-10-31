"use client";

import dynamic from "next/dynamic";
import type { MapViewProps } from "@/components/map/map-inner";
import { Loader2 } from "lucide-react";

const Inner = dynamic(() => import("@/components/map/map-inner"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-56 w-full place-items-center rounded-3xl bg-surface-muted">
      <Loader2 className="h-5 w-5 animate-spin text-fg-subtle" />
    </div>
  ),
});

export default function MapView(props: MapViewProps) {
  return <Inner {...props} />;
}
