import { createHash } from "node:crypto";
import type { SpecAction } from "./specContracts";

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;
  const entries = Object.entries(value as Record<string, unknown>).filter(([, entry]) => entry !== undefined).sort(([left], [right]) => left.localeCompare(right));
  return Object.fromEntries(entries.map(([key, entry]) => [key, canonicalize(entry)]));
}

export function sha256Hex(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

export function specPayloadHash(action: SpecAction, payload: Record<string, unknown>) {
  return sha256Hex(JSON.stringify(canonicalize({ action, payload })));
}
