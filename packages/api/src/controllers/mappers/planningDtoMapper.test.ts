import { describe, expect, it } from "vitest";
import { TaskError } from "../../application/services/tasks/taskErrors";
import type { PlanningDecisionRecord, PlanningProjectionRecord } from "../../application/database/dao/taskPlanningDao";
import { planningDto } from "./planningDtoMapper";

const createdAt = new Date("2026-10-05T12:00:00.000Z");
const publication = { outcome: "created", taskId: "t", repositoryBindingMatches: true, attemptId: "a", repositoryId: "1", repositoryNodeId: "R", issueId: "2", issueNumber: 3, issueUrl: "https://github.com/a/b/issues/3", title: "Título", bodyMarkdown: "Corpo" };
const decision: PlanningDecisionRecord = { id: "d", taskId: "t", publicationAttemptId: "a", operationId: "o", executionId: "e", version: 1, recommendedRoute: "tech_spec", complexity: "medium", summary: "Resumo", reasons: ["Motivo"], uncertainties: [], selectedRoute: "tech_spec", decisionSource: "AI", status: "review", createdAt, approvedByUserId: null, approvedAt: null };
const record = (overrides: Partial<PlanningProjectionRecord>): PlanningProjectionRecord => ({ taskStatus: "published", planningStatus: "review", operation: null, decision, publication, ...overrides });
const author = { isAuthor: true };

describe("planning DTO mapper", () => {
  it("UT-043 returns ISO times and only named assessment fields", () => {
    const dto = planningDto(record({}), author);
    expect(dto.decision).toEqual({ id: "d", taskId: "t", publicationAttemptId: "a", operationId: "o", executionId: "e", version: 1, recommendedRoute: "tech_spec", complexity: "medium", summary: "Resumo", reasons: ["Motivo"], uncertainties: [], selectedRoute: "tech_spec", decisionSource: "AI", status: "review", createdAt: "2026-10-05T12:00:00.000Z", approvedByUserId: null, approvedAt: null });
    expect(dto.permissions).toEqual({ canStart: false, canRetry: false, canSelectRoute: true, canApprove: true });
  });

  it("UT-044 rejects a review without a saved decision", () => {
    expect(() => planningDto(record({ decision: null }), author)).toThrowError(new TaskError("invalid_stored_content"));
  });

  it("UT-045 projects awaiting for a published task without planning", () => {
    expect(planningDto(record({ planningStatus: null, decision: null }), author)).toMatchObject({ status: "awaiting", decision: null, operation: null, eligibility: { canStart: true }, permissions: { canStart: true } });
  });

  it("UT-081 exposes the real running operation without approval", () => {
    const operation = { id: "o2", state: "running", createdAt, lastError: null, nextRunAt: createdAt, attempts: 1 };
    expect(planningDto(record({ planningStatus: "in_progress", decision: null, operation }), author)).toMatchObject({ status: "in_progress", decision: null, operation: { id: "o2", state: "running", retryAt: null }, permissions: { canApprove: false } });
  });

  it("gives readers no permissions and nonpublished tasks no planning status", () => {
    expect(planningDto(record({}), { isAuthor: false }).permissions).toEqual({ canStart: false, canRetry: false, canSelectRoute: false, canApprove: false });
    expect(planningDto(record({ taskStatus: "draft_ready", planningStatus: null, decision: null }), author).status).toBeNull();
  });
});
