import { describe, expect, it } from "vitest";
import { planningApprovalInputSchema, planningCommandInputSchema, planningRetryInputSchema, planningSelectionInputSchema, planningSubmissionInputSchema } from "./planning";

const id = "00000000-0000-4000-8000-000000000001";
const command = { projectId: id, taskId: id, requestKey: id, expectedVersion: 7 };
const review = { ...command, decisionId: id, expectedDecisionVersion: 1 };

describe("planning schemas", () => {
  it("UT-040 keeps exactly the documented fields", () => {
    expect(planningCommandInputSchema.parse(command)).toEqual(command);
    expect(planningRetryInputSchema.parse({ ...command, failedOperationId: id })).toEqual({ ...command, failedOperationId: id });
    expect(planningSelectionInputSchema.parse({ ...review, selectedRoute: "prd" })).toEqual({ ...review, selectedRoute: "prd" });
    expect(planningApprovalInputSchema.parse({ ...review, reviewedRoute: "tech_spec" })).toEqual({ ...review, reviewedRoute: "tech_spec" });
    expect(planningSubmissionInputSchema.parse({ projectId: id, taskId: id, requestKey: id, action: "planning.approve" }).action).toBe("planning.approve");
  });

  it.each([
    [planningCommandInputSchema, { ...command, taskId: "bad" }],
    [planningCommandInputSchema, { ...command, expectedVersion: 0 }],
    [planningCommandInputSchema, { ...command, expectedVersion: 1.5 }],
    [planningCommandInputSchema, { ...command, expectedVersion: Number.MAX_SAFE_INTEGER + 2 }],
    [planningCommandInputSchema, { ...command, actorUserId: id }],
    [planningRetryInputSchema, command],
    [planningSelectionInputSchema, review],
    [planningSelectionInputSchema, { ...review, selectedRoute: "tasks" }],
    [planningApprovalInputSchema, { ...review, reviewedRoute: "prd", approvedAt: "now" }],
    [planningApprovalInputSchema, { ...review, reviewedRoute: "prd", publication: {} }],
    [planningSubmissionInputSchema, { projectId: id, taskId: id, requestKey: id, action: "send" }],
  ])("UT-041 rejects invalid input %#", (schema, input) => {
    expect(schema.safeParse(input).success).toBe(false);
  });
});
