// The realtime server is a separate Node process, so it must load the
// repository .env itself before reading configuration at module scope.
import "../lib/env";

import { createServer } from "http";
import { Server } from "socket.io";
import { timingSafeEqual } from "crypto";
import { verifySocketToken } from "../lib/socket";

// Render/other PaaS assign a random `PORT`; self-hosted uses SOCKET_PORT.
const PORT = Number(process.env.SOCKET_PORT || process.env.PORT || 4001);
const ORIGIN = process.env.AUTH_URL || "http://localhost:3000";
const ALLOWED_ORIGINS = Array.from(
  new Set([
    ORIGIN,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ]),
);

function internalSecret() {
  return process.env.SOCKET_INTERNAL_SECRET || "rydex-socket-dev-secret";
}

function secretMatches(candidate: unknown) {
  if (typeof candidate !== "string") return false;
  const expected = Buffer.from(internalSecret());
  const supplied = Buffer.from(candidate);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

const httpServer = createServer((req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, {
      "content-type": "application/json",
      "access-control-allow-origin": ORIGIN,
    });
    res.end(
      JSON.stringify({
        ok: true,
        service: "rydex-socket",
        connections: io.engine.clientsCount,
        at: new Date().toISOString(),
      }),
    );
    return;
  }

  if (req.method === "POST" && req.url === "/emit") {
    if (!secretMatches(req.headers["x-socket-secret"])) {
      res.writeHead(401, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: "unauthorized" }));
      return;
    }
    let body = "";
    let tooLarge = false;
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 100_000) {
        tooLarge = true;
        req.destroy();
      }
    });
    req.on("end", () => {
      if (tooLarge) return;
      try {
        const { room, event, payload } = JSON.parse(body);
        if (!room || !event) throw new Error("room and event are required");
        io.to(String(room)).emit(String(event), payload);
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } catch (error) {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(
          JSON.stringify({
            ok: false,
            error: error instanceof Error ? error.message : "bad request",
          }),
        );
      }
    });
    return;
  }

  res.writeHead(404).end();
});

const io = new Server(httpServer, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

io.use((socket, next) => {
  const auth = verifySocketToken(String(socket.handshake.auth?.token || ""));
  if (!auth) return next(new Error("Unauthorized socket token"));
  socket.data.userId = auth.userId;
  socket.data.bookingId = auth.bookingId;
  next();
});

io.on("connection", (socket) => {
  const userId = socket.data.userId as string;
  const bookingId = socket.data.bookingId as string | null;
  socket.join(`user:${userId}`);
  if (bookingId) socket.join(`booking:${bookingId}`);

  socket.emit("socket:ready", { userId, bookingId, at: new Date().toISOString() });

  socket.on("ping", (callback?: () => void) => {
    if (typeof callback === "function") callback();
  });
});

httpServer.listen(PORT, () => {
  console.log(`[socket] RYDEX realtime server listening on :${PORT}`);
  console.log(`[socket] allowed origin ${ORIGIN}`);
});
