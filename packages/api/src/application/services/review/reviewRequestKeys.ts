import { createHash } from "node:crypto";
import type { ReviewRole } from "./reviewCycleTypes";

const REVIEW_REQUEST_PREFIX = "review";

export function reviewOpenRequestKey(input: { cycleId: string; role: ReviewRole; attempt: number }) {
  return requestKeyOf(`${REVIEW_REQUEST_PREFIX}:${input.cycleId}:${input.role}:${input.attempt}`);
}

export function reviewMessageRequestKey(input: { cycleId: string; role: ReviewRole; round: number; revision: number }) {
  return requestKeyOf(`${REVIEW_REQUEST_PREFIX}:${input.cycleId}:${input.role}:${input.round}:${input.revision}`);
}

function requestKeyOf(value: string) {
  const hash = createHash("sha256").update(value).digest("hex").slice(0, 32);
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20)}`;
}
