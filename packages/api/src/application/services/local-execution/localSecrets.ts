import { createHash, randomBytes, timingSafeEqual, createCipheriv, createDecipheriv } from "node:crypto";

const TOKEN_BYTES = 32;

export function createSecret() { return randomBytes(TOKEN_BYTES).toString("base64url"); }
export function createPairingCode() { return randomBytes(6).toString("base64url"); }
export function hashSecret(value: string) { return createHash("sha256").update(value).digest("hex"); }
export function secretsMatch(value: string, expectedHash: string) {
  const actual = Buffer.from(hashSecret(value), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function encryptPendingSecret(value: string, key: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", Buffer.from(key, "base64"), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [cipher.getAuthTag(), iv, encrypted].map((part) => part.toString("base64url")).join(".");
}

export function decryptPendingSecret(value: string, key: string) {
  const [tag, iv, encrypted] = value.split(".").map((part) => Buffer.from(part, "base64url"));
  if (!tag || !iv || !encrypted) throw new Error("pending_secret_invalid");
  const decipher = createDecipheriv("aes-256-gcm", Buffer.from(key, "base64"), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
