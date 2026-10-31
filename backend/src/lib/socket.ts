import { createHmac, timingSafeEqual } from "crypto";

function authSecret() {
  return process.env.AUTH_SECRET || "rydex-development-pepper";
}

function internalSecret() {
  return process.env.SOCKET_INTERNAL_SECRET || "rydex-socket-dev-secret";
}

export function socketEmitUrl() {
  const configured = process.env.SOCKET_EMIT_URL;
  if (configured) return configured.replace(/\/$/, "");
  if (process.env.NODE_ENV === "production") return "";
  return `http://127.0.0.1:${process.env.SOCKET_PORT || 4001}`;
}

export function socketPublicUrl() {
  const configured = process.env.NEXT_PUBLIC_SOCKET_URL;
  if (configured) return configured.replace(/\/$/, "");
  if (process.env.NODE_ENV === "production") return "";
  return `http://127.0.0.1:${process.env.SOCKET_PORT || 4001}`;
}

export function emitSocketEvent(room: string, event: string, payload: unknown) {
  const url = socketEmitUrl();
  if (!url) return;
  fetch(`${url}/emit`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-socket-secret": internalSecret(),
    },
    body: JSON.stringify({ room, event, payload }),
    signal: AbortSignal.timeout(2500),
  }).catch((error) => {
    console.warn("[socket] emit skipped:", error instanceof Error ? error.message : error);
  });
}

export function signSocketToken(userId: string, bookingId?: string) {
  const exp = Date.now() + 60 * 60 * 1000;
  const payload = `${userId}.${bookingId || ""}.${exp}`;
  const signature = createHmac("sha256", authSecret()).update(payload).digest("base64url");
  return { token: `${payload}.${signature}`, exp, userId, bookingId: bookingId || null };
}

export function verifySocketToken(raw: string) {
  const parts = raw.split(".");
  if (parts.length !== 4) return null;
  const [userId, bookingId, exp, signature] = parts;
  if (!userId || Number(exp) < Date.now()) return null;
  const expected = createHmac("sha256", authSecret()).update(`${userId}.${bookingId}.${exp}`).digest("base64url");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return { userId, bookingId: bookingId || null };
}

export function bookingRoom(id: string) {
  return `booking:${id}`;
}

export function userRoom(id: string) {
  return `user:${id}`;
}
