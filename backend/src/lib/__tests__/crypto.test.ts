import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { decryptSensitive, encryptSensitive } from "@rydex/backend/lib/crypto";

const SECRET = "unit-test-secret-for-aes-256-gcm";

describe("AES-256-GCM sensitive value encryption", () => {
  beforeEach(() => {
    vi.stubEnv("AUTH_SECRET", SECRET);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("round-trips bank account numbers", () => {
    const account = "123456789012";
    const encrypted = encryptSensitive(account);

    expect(encrypted).not.toContain(account);
    expect(encrypted.startsWith("v1.")).toBe(true);
    expect(encrypted.split(".")).toHaveLength(4);
    expect(decryptSensitive(encrypted)).toBe(account);
  });

  it("uses a fresh IV so identical values produce different ciphertext", () => {
    const first = encryptSensitive("9876543210");
    const second = encryptSensitive("9876543210");

    expect(first).not.toBe(second);
    expect(decryptSensitive(first)).toBe("9876543210");
    expect(decryptSensitive(second)).toBe("9876543210");
  });

  it("fails closed when the ciphertext is tampered with", () => {
    const encrypted = encryptSensitive("123456789012");
    const parts = encrypted.split(".");
    const data = parts[3];
    parts[3] = `${data.slice(0, -2)}${data.endsWith("AA") ? "BB" : "AA"}`;

    expect(decryptSensitive(parts.join("."))).toBe("");
  });

  it("fails closed when the encryption key changes", () => {
    const encrypted = encryptSensitive("123456789012");
    vi.stubEnv("AUTH_SECRET", "a-completely-different-secret");

    expect(decryptSensitive(encrypted)).toBe("");
  });

  it("handles empty and legacy plaintext values", () => {
    expect(decryptSensitive()).toBe("");
    expect(decryptSensitive("")).toBe("");
    expect(decryptSensitive("legacy-plain-value")).toBe("legacy-plain-value");
  });
});
