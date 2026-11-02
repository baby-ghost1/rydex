"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

export interface RideRequestPayload {
  bookingId: string;
  vehicle: { name: string; category: string; image: string; registrationNumber: string };
  rider: { name: string; phone: string; rating: number };
  pickup: { address: string; lat: number; lng: number };
  drop: { address: string; lat: number; lng: number };
  distanceKm: number;
  durationMin: number;
  fare: number;
  partnerEarning: number;
  paymentMethod: "cash" | "online";
  requestedAt: string;
}

/**
 * Connects the signed-in partner to their personal socket room so ride
 * requests and booking updates arrive instantly.
 */
export function usePartnerSocket(onRideRequest: (payload: RideRequestPayload) => void) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const callbackRef = useRef(onRideRequest);

  useEffect(() => {
    callbackRef.current = onRideRequest;
  }, [onRideRequest]);

  useEffect(() => {
    let cancelled = false;
    let activeSocket: Socket | null = null;

    async function connect() {
      try {
        const res = await fetch("/api/socket/token");
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;

        const nextSocket = io(data.url || process.env.NEXT_PUBLIC_SOCKET_URL || "", {
          auth: { token: data.token },
          transports: ["websocket", "polling"],
          reconnectionAttempts: 10,
          reconnectionDelay: 1500,
        });
        activeSocket = nextSocket;
        setSocket(nextSocket);

        nextSocket.on("connect", () => setConnected(true));
        nextSocket.on("disconnect", () => setConnected(false));
        nextSocket.on("ride:request", (payload: RideRequestPayload) => {
          callbackRef.current(payload);
        });
      } catch (error) {
        console.warn("[socket] partner connect failed", error);
      }
    }

    connect();

    return () => {
      cancelled = true;
      activeSocket?.emit("partner:leave", null);
      activeSocket?.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, []);

  const joinAsPartner = useCallback(
    (lat: number, lng: number) => {
      socket?.emit("partner:join", { lat, lng });
    },
    [socket],
  );

  const updateLocation = useCallback(
    (lat: number, lng: number) => {
      socket?.emit("partner:location", { lat, lng });
    },
    [socket],
  );

  const leaveAsPartner = useCallback(() => {
    socket?.emit("partner:leave", null);
  }, [socket]);

  return { socket, connected, joinAsPartner, updateLocation, leaveAsPartner };
}