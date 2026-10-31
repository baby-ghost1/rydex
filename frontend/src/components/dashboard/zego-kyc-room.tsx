"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2, ShieldCheck, Video, X } from "lucide-react";
import { api } from "@/lib/client-api";

interface TokenResponse {
  appId: number;
  token: string;
  roomId: string;
  userId: string;
  targetUserId: string;
}

export default function ZegoKycRoom({
  open,
  onClose,
  vendorId,
  onJoined,
}: {
  open: boolean;
  onClose: () => void;
  vendorId?: string;
  onJoined?: (roomId: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<{ destroy: () => void } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function start() {
      setLoading(true);
      setError("");
      setJoined(false);
      try {
        const data = await api<TokenResponse>(
          `/api/zego/token${vendorId ? `?vendorId=${encodeURIComponent(vendorId)}` : ""}`,
        );
        if (cancelled) return;
        const { ZegoUIKitPrebuilt } = await import("@zegocloud/zego-uikit-prebuilt");
        if (cancelled || !containerRef.current) return;
        const instance = ZegoUIKitPrebuilt.create(data.token);
        instanceRef.current = instance;
        instance.joinRoom({
          container: containerRef.current,
          scenario: { mode: ZegoUIKitPrebuilt.OneONoneCall },
          maxUsers: 2,
          showPreJoinView: false,
          turnOnCameraWhenJoining: true,
          turnOnMicrophoneWhenJoining: true,
          useFrontFacingCamera: true,
          showMyCameraToggleButton: true,
          showMyMicrophoneToggleButton: true,
          showAudioVideoSettingsButton: true,
          showScreenSharingButton: false,
          showTextChat: false,
          showUserList: false,
          showLayoutButton: false,
          showRoomDetailsButton: false,
          showLeavingView: false,
          showPinButton: false,
          showInviteToCohostButton: false,
          showRequestToCohostButton: false,
          showRemoveCohostButton: false,
          showNonVideoUser: true,
          showOnlyAudioUser: true,
          layout: "Auto",
          onJoinRoom: () => {
            if (cancelled) return;
            setLoading(false);
            setJoined(true);
            onJoined?.(data.roomId);
          },
          onLeaveRoom: () => {
            if (!cancelled) onClose();
          },
        });
        // The SDK takes a moment to mount its iframe; the loading state clears on join.
        setTimeout(() => {
          if (!cancelled) setLoading(false);
        }, 12_000);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not start the video KYC call.");
          setLoading(false);
        }
      }
    }

    start();
    return () => {
      cancelled = true;
      try {
        instanceRef.current?.destroy();
      } catch {
        // The SDK may already have destroyed itself.
      }
      instanceRef.current = null;
    };
  }, [open, vendorId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex flex-col bg-ink" role="dialog" aria-modal="true" aria-label="Video KYC call">
      <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2.5 text-white">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-lime text-ink">
            <Video className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-bold">RYDEX video KYC</p>
            <p className="text-[10px] text-fg-inverse-subtle">
              {vendorId ? "Joining the partner's verification room" : "Identity verification room"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {joined && (
            <span className="hidden items-center gap-1.5 rounded-full bg-success/15 px-3 py-1.5 text-[10px] font-semibold text-success sm:inline-flex">
              <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-success" /> Live
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-white/15 px-3.5 text-xs font-semibold text-fg-inverse-muted transition hover:bg-surface/10 hover:text-white"
          >
            <X className="h-3.5 w-3.5" /> Leave
          </button>
        </div>
      </header>

      <div className="relative min-h-0 flex-1 p-2 sm:p-4">
        <div ref={containerRef} id="zego-container" className="h-full min-h-[420px] overflow-hidden rounded-2xl bg-black sm:rounded-3xl" />
        {loading && (
          <div className="pointer-events-none absolute inset-2 grid place-items-center rounded-2xl bg-ink/75 sm:inset-4 sm:rounded-3xl">
            <div className="text-center text-white">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-lime" />
              <p className="mt-3 text-sm font-semibold">Connecting to your verification room…</p>
              <p className="mt-1 text-[11px] text-fg-inverse-subtle">Allow camera and microphone access when prompted.</p>
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-2 grid place-items-center rounded-2xl bg-ink/90 p-5 sm:inset-4 sm:rounded-3xl">
            <div className="max-w-md text-center text-white">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-danger/15">
                <AlertCircle className="h-5 w-5 text-danger" />
              </span>
              <p className="font-display mt-4 text-xl font-bold">Could not start video KYC</p>
              <p className="mt-2 text-xs leading-relaxed text-fg-inverse-muted">{error}</p>
              <p className="mt-4 text-[11px] text-fg-inverse-subtle">
                You can close this and upload a recorded verification video instead.
              </p>
              <button type="button" onClick={onClose} className="btn-light mt-5">
                Back to onboarding
              </button>
            </div>
          </div>
        )}
      </div>

      <footer className="flex items-center justify-center gap-2 border-t border-white/10 px-4 py-3 text-center text-[10px] text-fg-inverse-subtle">
        <ShieldCheck className="h-3.5 w-3.5 text-lime" />
        This call is used only to verify your identity. Do not share bank credentials or OTPs.
      </footer>
    </div>
  );
}

