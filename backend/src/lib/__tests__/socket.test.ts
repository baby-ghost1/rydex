import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  bookingRoom,
  signSocketToken,
  userRoom,
  verifySocketToken,
} from "@rydex/backend/lib/socket";

const SECRET = "socket-test-secret";

describe("signed socket tokens", () => {
  beforeEach(() => {
    vi.stubEnv("AUTH_SECRET", SECRET);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("signs and verifies a user token", () => {
    const signed = signSocketToken("user-123");
    expect(signed.token.split(".")).toHaveLength(4);
    expect(signed.exp).toBeGreaterThan(Date.now());
    expect(verifySocketToken(signed.token)).toEqual({
      userId: "user-123",
      bookingId: null,
    });
  });

  it("keeps the booking scope in the token", () => {
    const signed = signSocketToken("user-123", "booking-456");
    expect(verifySocketToken(signed.token)).toEqual({
      userId: "user-123",
      bookingId: "booking-456",
    });
  });

  it("rejects a tampered user id", () => {
    const signed = signSocketToken("user-123", "booking-456");
    const tampered = signed.token.replace("user-123", "user-999");
    expect(verifySocketToken(tampered)).toBeNull();
  });

  it("rejects a malformed token", () => {
    expect(verifySocketToken("")).toBeNull();
    expect(verifySocketToken("one.two.three")).toBeNull();
    expect(verifySocketToken("one.two.three.four")).toBeNull();
  });

  it("rejects an expired token", () => {
    const exp = Date.now() - 1_000;
    const signature = createHmac("sha256", SECRET)
      .update(`user-1.booking-1.${exp}`)
      .digest("base64url");

    expect(verifySocketToken(`user-1.booking-1.${exp}.${signature}`)).toBeNull();
  });

  it("rejects a token signed with a different secret", () => {
    const signed = signSocketToken("user-123");
    vi.stubEnv("AUTH_SECRET", "different-secret");

    expect(verifySocketToken(signed.token)).toBeNull();
  });

  it("builds stable room names", () => {
    expect(bookingRoom("abc")).toBe("booking:abc");
    expect(userRoom("xyz")).toBe("user:xyz");
  });
});
