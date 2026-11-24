import { Buffer } from "node:buffer";
import type { SecretAnswerChunk, SecretAnswerDelivery } from "../../application/terminal/secretAnswerTransport";

const MAX_CHUNK_BYTES = 4_500;
const MAX_DELIVERY_BYTES = 64_000;
const MAX_CHUNKS = Math.ceil(MAX_DELIVERY_BYTES / MAX_CHUNK_BYTES);
const MAX_CHUNK_BASE64_LENGTH = 6_000;

export function encodeSecretAnswer(input: SecretAnswerDelivery): string[] {
  const bytes = Buffer.from(JSON.stringify(input), "utf8");
  if (bytes.length > MAX_DELIVERY_BYTES) throw new Error("secret_answer_too_large");
  const total = Math.ceil(bytes.length / MAX_CHUNK_BYTES);
  return Array.from({ length: total }, (_, sequence) => JSON.stringify({ requestId: input.requestId, deliveryId: input.deliveryId, sequence, total, data: bytes.subarray(sequence * MAX_CHUNK_BYTES, (sequence + 1) * MAX_CHUNK_BYTES).toString("base64") } satisfies SecretAnswerChunk));
}

export function decodeSecretAnswer(chunks: string[]): SecretAnswerDelivery | null {
  try {
    const bytes = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk, "base64")));
    if (bytes.length > MAX_DELIVERY_BYTES) return null;
    const input = JSON.parse(bytes.toString("utf8")) as SecretAnswerDelivery;
    return isDelivery(input) ? input : null;
  } catch {
    return null;
  }
}

export function parseChunk(payload: string): SecretAnswerChunk | null {
  try {
    const value = JSON.parse(payload) as SecretAnswerChunk;
    return typeof value.requestId === "string" && typeof value.deliveryId === "string" && Number.isInteger(value.sequence) && value.sequence >= 0 && Number.isInteger(value.total) && value.total > 0 && value.total <= MAX_CHUNKS && value.sequence < value.total && typeof value.data === "string" && value.data.length <= MAX_CHUNK_BASE64_LENGTH && /^[A-Za-z0-9+/]*={0,2}$/.test(value.data) ? value : null;
  } catch {
    return null;
  }
}

function isDelivery(value: SecretAnswerDelivery): boolean {
  return typeof value.requestId === "string" && typeof value.deliveryId === "string" && typeof value.answeredBy === "string" && typeof value.at === "string" && value.answers !== null && typeof value.answers === "object";
}
