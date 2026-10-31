import { describe, expect, it } from "vitest";
import { clientIp, rateLimit } from "@rydex/backend/lib/rate-limit";

function uniqueKey(prefix: string) {
  return `${prefix}:${Date.now()}:${Math.random()}`;
}

describe("rateLimit", () => {
  it("allows requests up to the limit and blocks the next one", () => {
    const key = uniqueKey("test");
    const first = rateLimit(key, 3, 60_000);
    const second = rateLimit(key, 3, 60_000);
    const third = rateLimit(key, 3, 60_000);
    const fourth = rateLimit(key, 3, 60_000);

    expect(first).toMatchObject({ allowed: true, remaining: 2 });
    expect(second).toMatchObject({ allowed: true, remaining: 1 });
    expect(third).toMatchObject({ allowed: true, remaining: 0 });
    expect(fourth.allowed).toBe(false);
    expect(fourth.remaining).toBe(0);
    expect(fourth.retryAfter).toBeGreaterThan(0);
  });

  it("starts a fresh window after expiry", async () => {
    const key = uniqueKey("expiry");
    rateLimit(key, 1, 10);
    expect(rateLimit(key, 1, 10).allowed).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, 25));

    expect(rateLimit(key, 1, 10).allowed).toBe(true);
  });

  it("keeps buckets isolated by key", () => {
    const a = uniqueKey("a");
    const b = uniqueKey("b");
    rateLimit(a, 1, 60_000);

    expect(rateLimit(a, 1, 60_000).allowed).toBe(false);
    expect(rateLimit(b, 1, 60_000).allowed).toBe(true);
  });
});

describe("clientIp", () => {
  it("prefers the first forwarded address", () => {
    const request = new Request("http://localhost", {
      headers: { "x-forwarded-for": "203.0.113.5, 10.0.0.1" },
    });
    expect(clientIp(request)).toBe("203.0.113.5");
  });

  it("falls back to the real IP header", () => {
    const request = new Request("http://localhost", {
      headers: { "x-real-ip": "198.51.100.7" },
    });
    expect(clientIp(request)).toBe("198.51.100.7");
  });

  it("falls back to a local sentinel", () => {
    expect(clientIp(new Request("http://localhost"))).toBe("local");
  });
});
