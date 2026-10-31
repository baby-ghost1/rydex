"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

export interface LiveEvent {
  event: string;
  payload: unknown;
}

export function useBookingSocket(
  bookingId: string | null | undefined,
  onEvent: (event: LiveEvent) => void,
): { connected: boolean; socket: Socket | null } {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const callbackRef = useRef(onEvent);

  useEffect(() => {
    callbackRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!bookingId) return;
    let cancelled = false;
    let activeSocket: Socket | null = null;

    async function connect() {
      try {
        const res = await fetch(`/api/socket/token?bookingId=${bookingId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const nextSocket = io(data.url || process.env.NEXT_PUBLIC_SOCKET_URL || "", {
          auth: { token: data.token },
          transports: ["websocket", "polling"],
          reconnectionAttempts: 5,
        });
        activeSocket = nextSocket;
        setSocket(nextSocket);
        for (const event of ["booking:update", "booking:location", "chat:message"]) {
          nextSocket.on(event, (payload) => callbackRef.current({ event, payload }));
        }
        nextSocket.on("connect", () => {
          setConnected(true);
          callbackRef.current({ event: "socket:connected", payload: null });
        });
        nextSocket.on("disconnect", () => {
          setConnected(false);
          callbackRef.current({ event: "socket:disconnected", payload: null });
        });
      } catch (error) {
        console.warn("[socket] connect failed", error);
      }
    }

    connect();
    return () => {
      cancelled = true;
      activeSocket?.disconnect();
      if (activeSocket) setSocket(null);
      setConnected(false);
    };
  }, [bookingId]);

  return { connected, socket };
}
