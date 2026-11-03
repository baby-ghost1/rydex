"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Circle, LocateFixed, Loader2, Radio, Settings2, Wifi, WifiOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import Modal from "@/components/ui/modal";
import RideFlashBanner from "@/components/ui/ride-flash-banner";
import { api, ClientApiError } from "@/lib/client-api";
import { playOfflineSound, playOnlineSound } from "@/lib/sounds";
import {
  usePartnerSocket,
  type RideClosedPayload,
  type RideRequestPayload,
} from "@/hooks/use-partner-socket";
import { cn } from "@rydex/shared/utils";

const STORAGE_KEY = "rydex-partner-online";
const SEND_INTERVAL_MS = 20_000;

interface Preferences {
  acceptRadiusKm: number;
}

interface PartnerPresenceValue {
  online: boolean;
  starting: boolean;
  resuming: boolean;
  connected: boolean;
  position: { lat: number; lng: number } | null;
  preferences: Preferences;
  toggleOnline: () => void;
  openSettings: () => void;
}

const PartnerPresenceContext = createContext<PartnerPresenceValue | null>(null);

export function usePartnerPresence() {
  return useContext(PartnerPresenceContext);
}

/**
 * Owns the partner's online state, geolocation heartbeat, socket watcher and
 * incoming ride banner. Mounted once so the sidebar card and banner share one
 * connection instead of creating duplicate watchers.
 */
export default function PartnerPresenceProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { data: session } = useSession();
  const isPartner = session?.user?.role === "partner" && session.user.partnerStatus === "approved";

  const [online, setOnline] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [starting, setStarting] = useState(false);
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [preferences, setPreferences] = useState<Preferences>({ acceptRadiusKm: 10 });
  const [draft, setDraft] = useState<Preferences>({ acceptRadiusKm: 10 });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [request, setRequest] = useState<RideRequestPayload | null>(null);
  const requestRef = useRef<RideRequestPayload | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const watchRef = useRef<number | null>(null);
  const heartbeatRef = useRef<number | null>(null);
  const lastSentRef = useRef(0);
  const positionRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    requestRef.current = request;
  }, [request]);

  const handleRideRequest = useCallback((payload: RideRequestPayload) => {
    setRequest(payload);
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted" && document.hidden) {
      try {
        const notification = new Notification("New RYDEX ride request", {
          body: `${payload.rider.name} · ${payload.categoryLabel || payload.vehicle?.name || "Ride"} · ${payload.pickup.address}`,
          tag: payload.bookingId,
        });
        notification.onclick = () => window.focus();
      } catch {
        // Notifications can fail on some mobile browsers.
      }
    }
  }, []);

  const handleRideClosed = useCallback((payload: RideClosedPayload) => {
    if (requestRef.current?.bookingId === payload.bookingId) {
      setRequest(null);
      toast.info(
        payload.status === "accepted"
          ? "Another partner accepted this ride."
          : payload.status === "cancelled"
            ? "This ride was cancelled by the rider."
            : "This ride is no longer available.",
      );
    }
    setRejecting((current) => (current === payload.bookingId ? null : current));
  }, []);

  const { connected, joinAsPartner, updateLocation, leaveAsPartner } = usePartnerSocket(
    handleRideRequest,
    handleRideClosed,
  );

  const pushLocation = useCallback(
    async (coords: { lat: number; lng: number }, isOnline: boolean) => {
      try {
        await api("/api/partner/location", {
          method: "POST",
          json: { lat: coords.lat, lng: coords.lng, isOnline },
        });
      } catch (error) {
        console.warn("[partner] location update failed", error);
      }
    },
    [],
  );

  const startHeartbeat = useCallback(() => {
    if (heartbeatRef.current !== null) return;
    heartbeatRef.current = window.setInterval(() => {
      const coords = positionRef.current;
      if (!coords) return;
      updateLocation(coords.lat, coords.lng);
      void pushLocation(coords, true);
    }, SEND_INTERVAL_MS);
  }, [pushLocation, updateLocation]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current !== null) {
      window.clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  const startWatching = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("This browser does not support location sharing.");
      return false;
    }
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        positionRef.current = coords;
        setPosition(coords);
        updateLocation(coords.lat, coords.lng);
        const now = Date.now();
        if (now - lastSentRef.current > SEND_INTERVAL_MS) {
          lastSentRef.current = now;
          void pushLocation(coords, true);
        }
      },
      (error) => {
        console.warn("[partner] geolocation error", error);
        if (error.code === error.PERMISSION_DENIED) {
          toast.error("Location permission is required to receive ride requests.");
          setOnline(false);
          localStorage.setItem(STORAGE_KEY, "0");
          return;
        }
        // Timeouts/unavailability are usually transient — keep the partner online.
        toast.error("Couldn't read your location just yet. We'll keep retrying.");
      },
      { enableHighAccuracy: true, maximumAge: 15_000, timeout: 20_000 },
    );
    return true;
  }, [pushLocation, updateLocation]);

  const goOnline = useCallback(async () => {
    setStarting(true);
    try {
      const permission = "Notification" in window ? await Notification.requestPermission() : "denied";
      if (permission === "granted" && document.hidden) {
        // Nothing else to do here; the banner covers the visible tab.
      }
      if (!startWatching()) {
        setOnline(false);
        localStorage.setItem(STORAGE_KEY, "0");
        return;
      }
      setOnline(true);
      localStorage.setItem(STORAGE_KEY, "1");
      startHeartbeat();
      playOnlineSound();
      const coords = positionRef.current;
      if (coords) {
        joinAsPartner(coords.lat, coords.lng);
        await pushLocation(coords, true);
      }
      toast.success("You're online — ride requests will arrive instantly.");
    } finally {
      setStarting(false);
    }
  }, [joinAsPartner, pushLocation, startWatching, startHeartbeat]);

  const goOffline = useCallback(async () => {
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
    stopHeartbeat();
    setOnline(false);
    setRequest(null);
    localStorage.setItem(STORAGE_KEY, "0");
    leaveAsPartner();
    playOfflineSound();
    const coords = positionRef.current;
    if (coords) await pushLocation(coords, false);
    toast("You're offline — new requests are paused.");
  }, [leaveAsPartner, pushLocation, stopHeartbeat]);

  // Load saved preferences.
  useEffect(() => {
    if (!isPartner) return;
    api<{ preferences: Preferences }>("/api/partner/preferences")
      .then((data) => {
        const next = {
          acceptRadiusKm: data.preferences?.acceptRadiusKm || 10,
        };
        setPreferences(next);
        setDraft(next);
      })
      .catch(() => {});
  }, [isPartner]);

  // Resume online state after refresh (browser will reuse granted permission).
  useEffect(() => {
    if (!isPartner) return;
    if (localStorage.getItem(STORAGE_KEY) !== "1") return;
    setResuming(true);
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          await goOnline();
        } catch {
          // Keep the silent resume best-effort; the partner can retry with the toggle.
        } finally {
          setResuming(false);
        }
      })();
    }, 300);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPartner]);

  // Keep the socket in sync with the latest position when connection recovers.
  useEffect(() => {
    if (!online || !connected || !position) return;
    joinAsPartner(position.lat, position.lng);
  }, [online, connected, position, joinAsPartner]);

  useEffect(() => {
    return () => {
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
      if (heartbeatRef.current !== null) window.clearInterval(heartbeatRef.current);
    };
  }, []);

  async function savePreferences() {
    setSaving(true);
    try {
      await api("/api/partner/preferences", {
        method: "PATCH",
        json: draft,
      });
      setPreferences(draft);
      setSettingsOpen(false);
      toast.success("Ride preferences saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save preferences.");
    } finally {
      setSaving(false);
    }
  }

  async function acceptRide(bookingId: string) {
    try {
      await api(`/api/bookings/${bookingId}`, { method: "PATCH", json: { status: "accepted" } });
      setRequest(null);
      toast.success("Ride accepted — opening your ride.");
      router.push(`/bookings/${bookingId}`);
    } catch (error) {
      if (error instanceof ClientApiError && error.status === 409) {
        setRequest(null);
      }
      toast.error(error instanceof Error ? error.message : "Could not accept the ride.");
    }
  }

  async function rejectRide() {
    if (!rejecting || !rejectReason.trim()) return;
    try {
      await api(`/api/bookings/${rejecting}`, {
        method: "PATCH",
        json: { status: "rejected", reason: rejectReason.trim() },
      });
      setRequest(null);
      setRejecting(null);
      setRejectReason("");
      toast.success("Request declined.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not decline the ride.");
    }
  }

  const toggleOnline = useCallback(() => {
    void (online ? goOffline() : goOnline());
  }, [online, goOffline, goOnline]);

  const value: PartnerPresenceValue = {
    online,
    starting,
    resuming,
    connected,
    position,
    preferences,
    toggleOnline,
    openSettings: () => setSettingsOpen(true),
  };

  return (
    <PartnerPresenceContext.Provider value={value}>
      {children}

      {request && (
        <RideFlashBanner
          request={request}
          onAccept={acceptRide}
          onReject={(bookingId) => {
            setRejecting(bookingId);
            setRejectReason("");
          }}
          onDismiss={() => setRequest(null)}
        />
      )}

      <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} labelledBy="ride-preferences-title" className="max-w-md">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-fg-subtle">
          <Radio className="h-4 w-4" /> Ride preferences
        </div>
        <h2 id="ride-preferences-title" className="font-display mt-2 text-2xl font-extrabold tracking-tight">
          How far will you go?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-fg-muted">
          You&apos;ll only see requests from riders whose pickup is inside your radius.
        </p>

        <div className="mt-5 space-y-5">
          <label className="block">
            <span className="flex items-center justify-between text-xs font-semibold">
              <span>Pickup radius</span>
              <span className="text-fg-muted">{draft.acceptRadiusKm} km</span>
            </span>
            <input
              type="range"
              min={1}
              max={50}
              step={1}
              value={draft.acceptRadiusKm}
              onChange={(event) => setDraft((current) => ({ ...current, acceptRadiusKm: Number(event.target.value) }))}
              className="mt-2 w-full accent-ink"
            />
            <span className="mt-1 block text-[10px] text-fg-subtle">Riders whose pickup is within this distance.</span>
          </label>
        </div>

        <div className="mt-6 flex gap-2">
          <button type="button" onClick={() => setSettingsOpen(false)} className="btn-outline flex-1">
            Cancel
          </button>
          <button type="button" onClick={savePreferences} disabled={saving} className="btn-dark flex-1">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Circle className="h-4 w-4" />}
            Save
          </button>
        </div>
      </Modal>

      <Modal open={Boolean(rejecting)} onClose={() => setRejecting(null)} labelledBy="flash-decline-title" className="max-w-sm">
        <div className="flex items-center gap-2 text-danger">
          <XIcon /> <span className="text-[10px] font-semibold uppercase tracking-wider">Decline request</span>
        </div>
        <h2 id="flash-decline-title" className="font-display mt-2 text-xl font-extrabold tracking-tight">
          Why can&apos;t you take it?
        </h2>
        <textarea
          rows={3}
          value={rejectReason}
          onChange={(event) => setRejectReason(event.target.value)}
          placeholder="e.g. Vehicle is in service until tomorrow morning."
          className="input mt-4 resize-none"
          maxLength={300}
        />
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={() => setRejecting(null)} className="btn-outline flex-1">
            Back
          </button>
          <button
            type="button"
            onClick={rejectRide}
            disabled={!rejectReason.trim()}
            className="btn flex-1 bg-danger text-white hover:bg-danger/90"
          >
            Decline ride
          </button>
        </div>
      </Modal>
    </PartnerPresenceContext.Provider>
  );
}

export function PartnerPresenceCard({ className }: { className?: string }) {
  const presence = usePartnerPresence();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!presence || !mounted) {
    // Match the server render exactly (and never flash "You're offline" before
    // the resume effect runs) — show a neutral skeleton until mounted.
    return (
      <div
        aria-hidden="true"
        className={cn("h-[92px] animate-pulse rounded-2xl border border-line bg-surface-muted/60", className)}
      />
    );
  }
  const { online, starting, resuming, connected, position, preferences, toggleOnline, openSettings } = presence;
  const connecting = starting || resuming;

  return (
    <div className={cn("rounded-2xl border border-line bg-surface p-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "grid h-8 w-8 place-items-center rounded-full",
              online ? "bg-success/10 text-success" : "bg-surface-muted text-fg-subtle",
            )}
          >
            {online ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
          </span>
          <div>
            <p className="text-xs font-bold">{online ? "You're online" : connecting ? "Resuming…" : "You're offline"}</p>
            <p className="text-[10px] text-fg-subtle">
              {online
                ? connected
                  ? "Receiving ride requests"
                  : "Connecting…"
                : connecting
                  ? "Restoring your session"
                  : "Go online to get requests"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={toggleOnline}
          disabled={connecting}
          className={cn(
            "relative h-7 w-12 shrink-0 rounded-full transition",
            online ? "bg-success" : "bg-line-strong",
          )}
          aria-label={online ? "Go offline" : "Go online"}
          aria-pressed={online}
        >
          <span
            className={cn(
              "absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all",
              online ? "left-6" : "left-1",
            )}
          />
        </button>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 text-[10px] text-fg-muted">
        <span className="inline-flex items-center gap-1">
          <LocateFixed className="h-3 w-3" />
          {online
            ? position
              ? `${position.lat.toFixed(3)}, ${position.lng.toFixed(3)}`
              : "Locating…"
            : "Location paused"}
        </span>
        <button
          type="button"
          onClick={openSettings}
          className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-1 font-semibold text-fg-muted transition hover:border-line-strong hover:text-ink"
        >
          <Settings2 className="h-3 w-3" /> {preferences.acceptRadiusKm} km radius
        </button>
      </div>
    </div>
  );
}

function XIcon() {
  return <span className="grid h-4 w-4 place-items-center">×</span>;
}
