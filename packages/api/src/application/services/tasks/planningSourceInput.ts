import { createHash } from "node:crypto";
import { PlanningDomainError } from "./planningContracts";
import type { PlanningInput } from "./planningContracts";
import { PLANNING_BODY_MAX_CODE_POINTS, PLANNING_REQUEST_MAX_BYTES, PLANNING_TITLE_MAX_CODE_POINTS } from "./planningLimits";

export const PLANNING_SOURCE_FORMAT_VERSION = 2;
export type PlanningSource = { snapshotId: string; repositoryId: string; repositoryNodeId: string; issueNodeId: string; issueNumber: number; title: string; bodyMarkdown: string };
type Correlation = { operationId: string; executionId: string; taskId: string };

export function buildSourcePlanningInput(source: PlanningSource, correlation: Correlation): PlanningInput {
  assertWithinLimits(source);
  const snapshot = { attemptId: source.snapshotId, repositoryId: source.repositoryId, repositoryNodeId: source.repositoryNodeId, issueId: source.issueNodeId, issueNumber: source.issueNumber, title: source.title, bodyMarkdown: source.bodyMarkdown };
  const content = { formatVersion: PLANNING_SOURCE_FORMAT_VERSION, taskId: correlation.taskId, source: snapshot };
  const inputHash = createHash("sha256").update(JSON.stringify(content), "utf8").digest("hex");
  const input = { protocolVersion: 1 as const, ...correlation, inputHash, publication: snapshot };
  if (Buffer.byteLength(JSON.stringify(input), "utf8") > PLANNING_REQUEST_MAX_BYTES) throw new PlanningDomainError("planning_input_limit");
  return input;
}

function assertWithinLimits(source: PlanningSource) {
  if (!withinLimit(source.title, PLANNING_TITLE_MAX_CODE_POINTS) || !withinLimit(source.bodyMarkdown, PLANNING_BODY_MAX_CODE_POINTS)) throw new PlanningDomainError("planning_input_limit");
}

function withinLimit(value: string, maxCodePoints: number) {
  return Boolean(value.trim()) && Array.from(value).length <= maxCodePoints;
}

const PROBE_CORRELATION = { operationId: "00000000-0000-4000-8000-000000000001", executionId: "00000000-0000-4000-8000-000000000002", taskId: "00000000-0000-4000-8000-000000000003" };

export function planningSourceEligibility(source: PlanningSource | null) {
  if (!source) return { canStart: false, reason: "publication_required" as const };
  try { buildSourcePlanningInput(source, PROBE_CORRELATION); }
  catch (error) { if (error instanceof PlanningDomainError && error.reason === "planning_input_limit") return { canStart: false, reason: error.reason }; throw error; }
  return { canStart: true, reason: null };
}

type DecisionSource = { sourceSnapshotId: string | null; publicationAttemptId: string | null };
type CurrentSnapshot = { snapshotId: string; publicationAttemptId: string | null };

export function decisionMatchesSource(decision: DecisionSource, current: CurrentSnapshot) {
  if (decision.sourceSnapshotId) return decision.sourceSnapshotId === current.snapshotId;
  return decision.publicationAttemptId !== null && decision.publicationAttemptId === current.publicationAttemptId;
}
