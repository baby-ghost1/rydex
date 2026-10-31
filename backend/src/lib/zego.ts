import { createCipheriv } from "crypto";

function makeNonce() {
  return Math.ceil(-2147483648 + 4294967295 * Math.random());
}

function makeRandomIv() {
  const str = "0123456789abcdefghijklmnopqrstuvwxyz";
  let out = "";
  for (let i = 0; i < 16; i++) out += str.charAt(Math.floor(Math.random() * str.length));
  return out;
}

function cipherFor(key: Buffer) {
  if (key.length === 16) return "aes-128-cbc";
  if (key.length === 24) return "aes-192-cbc";
  if (key.length === 32) return "aes-256-cbc";
  throw new Error("ZEGOCLOUD server secret must be 32 bytes.");
}

/**
 * Official ZEGOCLOUD token04 generator.
 * https://github.com/ZEGOCLOUD/zego_server_assistant
 */
export function generateZegoToken(
  appId: number,
  userId: string,
  secret: string,
  effectiveTimeInSeconds: number,
  payload = "",
) {
  if (!appId || typeof appId !== "number") throw new Error("ZEGO app ID is invalid.");
  if (!userId) throw new Error("ZEGO user ID is invalid.");
  if (!secret || secret.length !== 32) throw new Error("ZEGO server secret must be 32 characters.");
  if (!effectiveTimeInSeconds) throw new Error("ZEGO token duration is invalid.");

  const createTime = Math.floor(Date.now() / 1000);
  const tokenInfo = {
    app_id: appId,
    user_id: userId,
    nonce: makeNonce(),
    ctime: createTime,
    expire: createTime + effectiveTimeInSeconds,
    payload,
  };
  const iv = makeRandomIv();
  const key = Buffer.from(secret);
  const cipher = createCipheriv(cipherFor(key), key, iv);
  cipher.setAutoPadding(true);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(tokenInfo)), cipher.final()]);

  const expireBuf = Buffer.alloc(8);
  expireBuf.writeBigInt64BE(BigInt(tokenInfo.expire), 0);
  const ivLen = Buffer.alloc(2);
  ivLen.writeUInt16BE(Buffer.byteLength(iv), 0);
  const cipherLen = Buffer.alloc(2);
  cipherLen.writeUInt16BE(encrypted.length, 0);

  return "04" + Buffer.concat([expireBuf, ivLen, Buffer.from(iv), cipherLen, encrypted]).toString("base64");
}

export function zegoConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_ZEGO_APP_ID && process.env.ZEGO_SERVER_SECRET);
}

export function kycRoomId(userId: string) {
  return `rydex-kyc-${userId.slice(-10)}`;
}
