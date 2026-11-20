import { describe, expect, it, vi } from "vitest";
import type { ExecutionRecord, TaskExecutionDao } from "../../database/dao/taskExecutionDao";
import type { CompozyGateway } from "../../compozy/compozyGateway";
import { ExecutionSpecReviewService } from "./executionSpecReviewService";

const execution: ExecutionRecord = { id: "execution", taskId: "task", planningDecisionId: "decision", route: "tech_spec", state: "spec_review", attempt: 1, idempotencyKey: "start-key", compozyWorkspaceId: "workspace", specTaskId: "spec-task", specWorktreeId: "worktree", specDir: ".compozy/tasks/fd-spec", workTaskId: "delivery-task", branch: "flow-dev/spec", specRound: 1, pullRequestUrl: null, detail: {}, failureCode: null, lastSyncedAt: null, startedBy: "actor", createdAt: new Date(), finishedAt: null };
const baseInput = { taskId: "task", executionId: "execution", round: 1, decision: "request_changes" as const, note: "Ajustar", idempotencyKey: "review-key", actorId: "actor" };

function service(state = execution.state, files: { path: string; kind: string }[] = []) {
  const dao = { findById: vi.fn(async () => ({ ...execution, state })), findSpecReviewByKey: vi.fn(async () => null), insertSpecReview: vi.fn() } as unknown as TaskExecutionDao;
  const gateway = { listFileEntries: vi.fn(async () => files) } as unknown as CompozyGateway;
  return new ExecutionSpecReviewService({ dao, gateway, clock: () => new Date() });
}

describe("spec review rules", () => {
  it("UT-023 rejects a stale round", async () => {
    await expect(service().review({ ...baseInput, round: 2 })).rejects.toMatchObject({ reason: "spec_round_stale" });
  });

  it("UT-024 requires the main spec file before approval", async () => {
    await expect(service().review({ ...baseInput, decision: "approve", note: undefined })).rejects.toMatchObject({ reason: "spec_missing_main_file" });
  });

  it.each([undefined, " ", "x".repeat(4_001)])("UT-026 rejects invalid change notes", async (note) => {
    await expect(service().review({ ...baseInput, note })).rejects.toMatchObject({ reason: "spec_note_invalid" });
  });

  it("UT-027 stops after five spec rounds", async () => {
    const current = { ...execution, specRound: 5 };
    const dao = { findById: vi.fn(async () => current), findSpecReviewByKey: vi.fn(async () => null) } as unknown as TaskExecutionDao;
    const gateway = { listFileEntries: vi.fn(async () => []) } as unknown as CompozyGateway;
    const review = new ExecutionSpecReviewService({ dao, gateway, clock: () => new Date() });
    await expect(review.review({ ...baseInput, round: 5 })).rejects.toMatchObject({ reason: "spec_round_limit" });
  });

  it("UT-028 rejects review outside spec_review", async () => {
    await expect(service("in_progress").review(baseInput)).rejects.toMatchObject({ reason: "spec_not_reviewable" });
  });
});
