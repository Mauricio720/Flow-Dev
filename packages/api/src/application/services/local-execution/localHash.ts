import { createHash } from "node:crypto";

function byKey([first]: [string, unknown], [second]: [string, unknown]) {
  if (first === second) return 0;
  return first < second ? -1 : 1;
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).sort(byKey).map(([key, entry]) => [key, canonical(entry)]));
}

// The payload is stored as jsonb, which reorders object keys, so the hash cannot depend on key order.
export function localPayloadHash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
}
