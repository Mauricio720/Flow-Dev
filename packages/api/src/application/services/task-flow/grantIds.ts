import { createHash } from "node:crypto";

const UUID_GROUPS = [8, 4, 4, 4, 12];

export function grantId(runId: string, connectionId: string) {
  const hex = createHash("sha256").update(`${runId}:${connectionId}`).digest("hex");
  let offset = 0;
  return UUID_GROUPS.map((length) => {
    const part = hex.slice(offset, offset + length);
    offset += length;
    return part;
  }).join("-");
}
