import type { SpecAction, SpecReason, SpecReceipt, SpecRoute, SpecStage, SpecState } from "../../services/spec/specContracts";
import type { StoredInteraction } from "../../services/spec/specInteractionRules";
import type { SpecEligibilityInput } from "../../services/spec/specEligibility";
import type { PlanningProjectionRecord } from "./taskPlanningDao";

export type SpecScope = { projectId: string; taskId: string };
export type SpecActorScope = SpecScope & { actorUserId: string };
export type SpecCommandTarget = SpecActorScope & { requestKey: string; payloadHash: string; expectedSpecVersion: number };
export type SpecCommandResult = SpecReceipt & { replayed: boolean };
export type SpecCommandPayload = { stage?: SpecStage; attemptId?: string; interactionId?: string; packageId?: string; failedAttemptId?: string; payload: Record<string, unknown> };
export type SpecStageRecord = { stage: SpecStage; state: SpecState; currentAttemptId: string | null; currentPackageId: string | null; approvedPackageId: string | null; version: number; approval: { approverUserId: string; approvedAt: Date } | null };
export type SpecAttemptRecord = { id: string; stage: SpecStage; attemptNumber: number; kind: string; state: string; terminalReason: string | null; createdAt: Date };
export type SpecInteractionRecord = { id: string; attemptId: string; kind: string; description: string; choices: string[] | null; targetDigest: string | null; delivery: string };
export type SpecWorkflowRecord = { id: string; authorUserId: string; selectedRoute: SpecRoute; version: number; currentStage: SpecStage; state: SpecState };
export type SpecSnapshotRecord = {
  eligibility: SpecEligibilityInput;
  taskAuthorUserId: string | null;
  workflow: SpecWorkflowRecord | null;
  stages: SpecStageRecord[];
  attempt: SpecAttemptRecord | null;
  interactions: SpecInteractionRecord[];
  packageCount: number;
  latestEventSequence: number;
  planning: PlanningProjectionRecord;
};
export type SpecEventRecord = { id: string; sequence: number; attemptId: string; kind: string; payload: Record<string, unknown>; observedAt: Date };
export type SpecPackageRecord = { id: string; stage: SpecStage; attemptId: string; revision: number; manifestHash: string; captureState: string; createdAt: Date };
export type SpecPackageDetailRecord = SpecPackageRecord & { packageIndex: Record<string, unknown>; diagnostics: unknown[]; diffSummary: Record<string, unknown>; parentPackageId: string | null; parentManifestHash: string | null; isCurrent: boolean; approval: { approverUserId: string; approvedAt: Date } | null; relations: { stories: unknown[]; tests: unknown[]; tasks: unknown[] }; decisions: unknown[]; sections: unknown[]; diff: unknown; documents: { id: string; path: string; role: string; sha256: string; byteCount: number }[] };
export type SpecDocumentRecord = { id: string; path: string; role: string; sha256: string; byteCount: number; sourceText: string; blocks: unknown[] };
export type SpecPageQuery = SpecScope & { cursor?: string; direction?: "after" | "before"; limit: number };

export type SpecDispatchAttempt = { attemptId: string; workflowId: string; projectId: string; taskId: string; authorUserId: string; stage: SpecStage; state: string; promptMessageId: string; promptIdempotencyKey: string };

export type ResolveInteractionRequest = SpecCommandTarget & { action: "spec.answer" | "spec.permission"; attemptId: string; interactionId: string; payload: Record<string, unknown>; validate: (interaction: StoredInteraction) => void; response: (interaction: StoredInteraction) => Record<string, unknown> };

export interface TaskSpecDao {
  resolveInteraction(input: ResolveInteractionRequest): Promise<SpecCommandResult>;
  findDispatchAttempt(attemptId: string): Promise<SpecDispatchAttempt | null>;
  failQueuedAttempt(input: { attemptId: string; reason: SpecReason }): Promise<boolean>;
  hadAccess(scope: SpecActorScope): Promise<boolean>;
  snapshot(scope: SpecScope): Promise<SpecSnapshotRecord>;
  submission(target: SpecActorScope & { action: SpecAction; requestKey: string }): Promise<SpecReceipt | null>;
  start(input: SpecCommandTarget & { stage: SpecStage }): Promise<SpecCommandResult>;
  accept(input: SpecCommandTarget & { action: Exclude<SpecAction, "spec.start"> } & SpecCommandPayload): Promise<SpecCommandResult>;
  events(input: SpecPageQuery): Promise<{ items: SpecEventRecord[]; nextCursor: string | null; hasMore: boolean }>;
  event(scope: SpecScope & { eventId: string }): Promise<SpecEventRecord>;
  packages(input: SpecPageQuery): Promise<{ items: SpecPackageRecord[]; nextCursor: string | null }>;
  package(scope: SpecScope & { packageId: string }): Promise<SpecPackageDetailRecord>;
  document(input: SpecScope & { packageId: string; documentId: string; cursor?: string; limit: number }): Promise<SpecDocumentRecord & { nextCursor: string | null; totalBlocks: number }>;
}
