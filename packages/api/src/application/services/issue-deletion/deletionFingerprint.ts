import { createHash } from "node:crypto";
import type { TaskDeletionFacts } from "../../database/dao/issueDeletionDao";
import type { DeletionDestination } from "./issueDeletionContracts";

export function fingerprintOf(parts: Record<string, unknown>): string {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex");
}

export function taskFingerprint(input: { projectId: string; taskId: string; repositoryId: string; repositoryNodeId: string; issueNodeId: string | null; destinations: DeletionDestination[] }) {
  return fingerprintOf({ kind: "task", ...input });
}

export function queueFingerprint(input: { projectId: string; issueNodeId: string; repositoryId: string; repositoryNodeId: string; destinations: DeletionDestination[] }) {
  return fingerprintOf({ kind: "queue", ...input });
}

export function isLinked(facts: Pick<TaskDeletionFacts, "issueNodeId" | "origin" | "status" | "publicationOutcomes">): boolean {
  return facts.issueNodeId !== null || facts.origin === "external" || facts.status === "published" || facts.publicationOutcomes.includes("created");
}
