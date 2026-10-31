import { describe, expect, it } from "vitest";
import { generateOtp, hashOtp, otpExpiry, verifyOtp } from "@rydex/backend/lib/otp";

describe("OTP security helpers", () => {
  it("generates the requested number of digits", () => {
    for (const length of [4, 6]) {
      for (let i = 0; i < 20; i += 1) {
        const otp = generateOtp(length);
        expect(otp).toMatch(new RegExp(`^\\d{${length}}$`));
        expect(otp[0]).not.toBe("0");
      }
    }
  });

  it("hashes deterministically without storing the raw code", () => {
    const hash = hashOtp("1234");
    expect(hash).toHaveLength(64);
    expect(hash).not.toContain("1234");
    expect(hashOtp("1234")).toBe(hash);
    expect(hashOtp("4321")).not.toBe(hash);
  });

  it("verifies only the matching code", () => {
    const hash = hashOtp("4821");
    expect(verifyOtp("4821", hash)).toBe(true);
    expect(verifyOtp("4822", hash)).toBe(false);
    expect(verifyOtp("", hash)).toBe(false);
    expect(verifyOtp("4821", undefined)).toBe(false);
    expect(verifyOtp("4821", null)).toBe(false);
  });

  it("rejects malformed stored hashes without throwing", () => {
    expect(verifyOtp("1234", "not-a-real-hash")).toBe(false);
  });

  it("sets expiry in the future", () => {
    const before = Date.now();
    const expiry = otpExpiry(10).getTime();
    expect(expiry).toBeGreaterThanOrEqual(before + 9 * 60_000);
    expect(expiry).toBeLessThanOrEqual(Date.now() + 10 * 60_000);
  });
});
