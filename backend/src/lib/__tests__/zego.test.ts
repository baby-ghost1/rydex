import { createDecipheriv } from "node:crypto";
import { describe, expect, it } from "vitest";
import { generateZegoToken, kycRoomId } from "@rydex/backend/lib/zego";

const APP_ID = 123456789;
const USER_ID = "user-abc";
const SECRET = "0123456789abcdef0123456789abcdef";

function decodeToken(token: string) {
  const raw = Buffer.from(token.slice(2), "base64");
  const expire = Number(raw.readBigInt64BE(0));
  const ivLength = raw.readUInt16BE(8);
  const iv = raw.subarray(10, 10 + ivLength).toString("utf8");
  const cipherLength = raw.readUInt16BE(10 + ivLength);
  const cipherText = raw.subarray(12 + ivLength, 12 + ivLength + cipherLength);
  const decipher = createDecipheriv("aes-256-cbc", Buffer.from(SECRET), iv);
  const json = Buffer.concat([decipher.update(cipherText), decipher.final()]).toString("utf8");

  return { expire, iv, info: JSON.parse(json) as Record<string, unknown> };
}

describe("ZEGOCLOUD token04", () => {
  it("creates a token04 payload with the expected fields", () => {
    const token = generateZegoToken(APP_ID, USER_ID, SECRET, 3600, "kyc");
    expect(token.startsWith("04")).toBe(true);

    const { expire, iv, info } = decodeToken(token);
    expect(iv).toHaveLength(16);
    expect(info.app_id).toBe(APP_ID);
    expect(info.user_id).toBe(USER_ID);
    expect(info.payload).toBe("kyc");
    expect(expire).toBeGreaterThan(Math.floor(Date.now() / 1000));
    expect(expire).toBeLessThanOrEqual(Math.floor(Date.now() / 1000) + 3600);
  });

  it("rejects invalid app ids", () => {
    expect(() => generateZegoToken(0, USER_ID, SECRET, 3600)).toThrow(/app ID/i);
    expect(() => generateZegoToken(Number.NaN, USER_ID, SECRET, 3600)).toThrow(/app ID/i);
  });

  it("rejects missing user ids and durations", () => {
    expect(() => generateZegoToken(APP_ID, "", SECRET, 3600)).toThrow(/user ID/i);
    expect(() => generateZegoToken(APP_ID, USER_ID, SECRET, 0)).toThrow(/duration/i);
  });

  it("requires a 32-character server secret", () => {
    expect(() => generateZegoToken(APP_ID, USER_ID, "short", 3600)).toThrow(/32 characters/i);
  });

  it("derives a stable, scoped KYC room id", () => {
    expect(kycRoomId("507f1f77bcf86cd799439011")).toBe("rydex-kyc-d799439011");
    expect(kycRoomId("abcdefghij")).toBe("rydex-kyc-abcdefghij");
  });
});
