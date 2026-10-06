import type { SpecSnapshotRecord } from "../../application/database/dao/taskSpecDao";
import { encodeTaskCursor } from "../../application/pagination/taskCursor";
import type { SpecStage } from "../../application/services/spec/specContracts";
import { specEligibility } from "../../application/services/spec/specEligibility";
import { nextStage } from "../../application/services/spec/specStages";

const NOT_STARTED_STATE = "not_started";
const APPROVED_STATE = "approved";

export function startableStage(snapshot: SpecSnapshotRecord, firstStage: SpecStage | null) {
  const { workflow } = snapshot;
  if (!workflow) return firstStage;
  const current = snapshot.stages.find((stage) => stage.stage === workflow.currentStage);
  return current?.state === APPROVED_STATE ? nextStage(workflow.selectedRoute, workflow.currentStage) : null;
}

export function specSnapshotDto(snapshot: SpecSnapshotRecord, actorUserId: string) {
  const eligibility = specEligibility(snapshot.eligibility);
  const { workflow } = snapshot;
  const isAuthor = snapshot.taskAuthorUserId === actorUserId;
  const nextStartableStage = eligibility.canStart ? startableStage(snapshot, eligibility.firstStage) : null;
  return {
    viewerId: actorUserId,
    specVersion: workflow?.version ?? 0,
    route: workflow?.selectedRoute ?? eligibility.route,
    state: workflow?.state ?? NOT_STARTED_STATE,
    currentStage: workflow?.currentStage ?? null,
    eligibility,
    blockers: eligibility.reason ? [eligibility.reason] : [],
    permissions: { isAuthor, canStart: isAuthor && nextStartableStage !== null, nextStartableStage },
    stages: snapshot.stages.map((stage) => ({ stage: stage.stage, state: stage.state, currentAttemptId: stage.currentAttemptId, currentPackageId: stage.currentPackageId, approvedPackageId: stage.approvedPackageId, approval: stage.approval && { approverUserId: stage.approval.approverUserId, approvedAt: stage.approval.approvedAt.toISOString() } })),
    attempt: snapshot.attempt && { ...snapshot.attempt, createdAt: snapshot.attempt.createdAt.toISOString() },
    pendingInteractions: snapshot.interactions,
    packageCount: snapshot.packageCount,
    eventCursor: workflow ? encodeTaskCursor({ kind: "spec_events", scope: workflow.id, position: String(snapshot.latestEventSequence), direction: "after" }) : null,
  };
}

type EventRecord = { id: string; sequence: number; attemptId: string; kind: string; payload: Record<string, unknown>; observedAt: Date };

export function specEventDto(event: EventRecord) {
  return { ...event, observedAt: event.observedAt.toISOString() };
}

export function specEventSummaryDto(event: EventRecord) {
  const { text, preview, ...rest } = event.payload as { text?: string; preview?: string };
  const shown = preview ?? text ?? "";
  return { ...event, observedAt: event.observedAt.toISOString(), payload: { ...rest, text: shown, preview: shown, hasFullText: typeof text === "string" && text.length > shown.length } };
}

export function specPackageDto<T extends { createdAt: Date; approval?: { approverUserId: string; approvedAt: Date } | null }>(item: T) {
  return { ...item, createdAt: item.createdAt.toISOString(), ...(item.approval !== undefined ? { approval: item.approval && { approverUserId: item.approval.approverUserId, approvedAt: item.approval.approvedAt.toISOString() } } : {}) };
}
