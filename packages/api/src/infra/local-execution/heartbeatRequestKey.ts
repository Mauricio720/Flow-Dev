import { randomUUID } from "node:crypto";
import type { PendingHeartbeat } from "./privateRegistry";

// The server rejects a known request key that arrives with a different payload, so a key is only reusable for the payload it was created for.
export function heartbeatRequestKey(pending: PendingHeartbeat | undefined, payloadHash: string): PendingHeartbeat {
  if (pending?.payloadHash === payloadHash) return pending;
  return { requestKey: randomUUID(), payloadHash };
}
