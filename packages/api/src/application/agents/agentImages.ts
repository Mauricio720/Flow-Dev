export type ImageOrigin =
  | { kind: "message"; messageNumber: number }
  | { kind: "draft"; caption: string }
  | { kind: "issue_body"; position: number; caption: string };

export type ImageCandidate = { id: string; contentType: string; byteSize: number; createdAt: Date; origin: ImageOrigin; available: boolean };
export type AgentImage = { id: string; contentType: string; content: Uint8Array; origin: ImageOrigin };
export type OmittedImage = { id: string; origin: ImageOrigin; reason: "limit" | "unavailable" };
export type ImageSelection = { selected: ImageCandidate[]; omitted: OmittedImage[] };

export const MAX_AGENT_IMAGES = 10;
export const MAX_AGENT_IMAGE_BYTES = 20 * 1024 * 1024;
export const AGENT_IMAGE_EXTENSIONS: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/gif": "gif", "image/webp": "webp" };

function uniqueCandidates(candidates: ImageCandidate[]) {
  const ids = new Set<string>();
  return candidates.filter((candidate) => {
    if (ids.has(candidate.id)) return false;
    ids.add(candidate.id);
    return true;
  });
}

function comparePriority(left: ImageCandidate, right: ImageCandidate) {
  const dateDifference = right.createdAt.getTime() - left.createdAt.getTime();
  return dateDifference || left.id.localeCompare(right.id);
}

export function selectAgentImages(candidates: ImageCandidate[]): ImageSelection {
  const unique = uniqueCandidates(candidates);
  const available = unique.filter((candidate) => candidate.available);
  const selectedIds = selectWithinLimits(available);
  const selected = unique.filter((candidate) => selectedIds.has(candidate.id));
  const omitted = unique.filter((candidate) => !selectedIds.has(candidate.id)).map((candidate) => ({
    id: candidate.id,
    origin: candidate.origin,
    reason: candidate.available ? "limit" as const : "unavailable" as const,
  }));
  return { selected, omitted };
}

function selectWithinLimits(candidates: ImageCandidate[]) {
  const selectedIds = new Set<string>();
  let bytes = 0;
  for (const candidate of [...candidates].sort(comparePriority)) {
    if (selectedIds.size >= MAX_AGENT_IMAGES || bytes + candidate.byteSize > MAX_AGENT_IMAGE_BYTES) continue;
    selectedIds.add(candidate.id);
    bytes += candidate.byteSize;
  }
  return selectedIds;
}
