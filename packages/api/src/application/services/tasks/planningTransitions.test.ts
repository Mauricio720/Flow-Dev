import { describe, expect, it } from "vitest";
import { parsePlanningReceipt } from "../../../infra/database/dao/tasks/planningReceiptHelpers";
import { TaskError } from "./taskErrors";
import { assertApprovable, assertRetryable, assertSelectable, assertStartable, isApprovalReplay } from "./planningTransitions";

const base = { authorUserId: "a", version: 7, status: "published", activeOperationId: null, planningStatus: null as string | null };
const actor = { actorUserId: "a", expectedVersion: 7 };
const decision = { id: "d", version: 1, status: "review", selectedRoute: "tech_spec" as const };
const review = { ...actor, decisionId: "d", expectedDecisionVersion: 1 };
const reason = (reasonName: string) => new TaskError(reasonName as never);

describe("planning transitions", () => {
  it("UT-077 rejects start after review, approval, or failure", () => {
    expect(() => assertStartable({ ...base, planningStatus: "review" }, actor)).toThrowError(reason("planning_exists"));
    expect(() => assertStartable({ ...base, planningStatus: "approved" }, actor)).toThrowError(reason("planning_exists"));
    expect(() => assertStartable({ ...base, planningStatus: "failed" }, actor)).toThrowError(reason("planning_retry_required"));
  });

  it("UT-022 rejects retry of an operation that is not the latest failure", () => {
    const failed = { ...base, planningStatus: "failed" };
    expect(() => assertRetryable(failed, { id: "o2", state: "failed" }, "o")).toThrowError(reason("planning_not_failed"));
    expect(() => assertRetryable(failed, { id: "o", state: "failed" }, "o")).not.toThrow();
  });

  it("UT-074 rejects selection of an approved decision", () => {
    expect(() => assertSelectable({ ...base, planningStatus: "approved" }, { ...decision, status: "approved" }, review)).toThrowError(reason("planning_approved"));
  });

  it("UT-078 and UT-079 require a saved decision", () => {
    for (const planningStatus of ["in_progress", "failed"]) {
      expect(() => assertApprovable({ ...base, planningStatus }, null, { ...review, reviewedRoute: "prd" })).toThrowError(reason("planning_not_ready"));
    }
    expect(() => assertSelectable({ ...base, planningStatus: "in_progress" }, null, review)).toThrowError(reason("planning_not_ready"));
  });

  it("UT-073 approves AI and override decisions regardless of uncertainties", () => {
    for (const selectedRoute of ["tech_spec", "prd"] as const) {
      const saved = { ...decision, selectedRoute };
      expect(() => assertApprovable({ ...base, planningStatus: "review" }, saved, { ...review, reviewedRoute: selectedRoute })).not.toThrow();
    }
  });

  it("recognizes an exact approval replay and nothing else", () => {
    const approved = { ...decision, status: "approved" };
    expect(isApprovalReplay(approved, { ...review, reviewedRoute: "tech_spec" })).toBe(true);
    expect(isApprovalReplay(approved, { ...review, reviewedRoute: "prd" })).toBe(false);
    expect(isApprovalReplay(approved, { ...review, expectedDecisionVersion: 2, reviewedRoute: "tech_spec" })).toBe(false);
  });

  it("UT-020 rejects stored receipts that are missing fields or invalid", () => {
    expect(() => parsePlanningReceipt({ operationId: null, decisionId: null, version: 3, decisionVersion: null })).toThrowError(reason("invalid_stored_content"));
    expect(() => parsePlanningReceipt({ taskId: "t", operationId: null, decisionId: null, version: 0, decisionVersion: null })).toThrowError(reason("invalid_stored_content"));
    expect(parsePlanningReceipt({ taskId: "t", operationId: "o", decisionId: null, version: 3, decisionVersion: null }).version).toBe(3);
  });
});
