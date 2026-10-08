import { describe, expect, it } from "vitest";
import { createAssignedIssuesRouter } from "./assignedIssues";
import type { AssignedIssuesController } from "../controllers/assignedIssuesController";

const projectId = "10000000-0000-4000-8000-000000000001";
const taskId = "20000000-0000-4000-8000-000000000001";
const requestKey = "40000000-0000-4000-8000-000000000001";
const noController = {} as AssignedIssuesController;
const caller = createAssignedIssuesRouter(noController).createCaller({ principal: null, requestId: "unit", responseHeaders: undefined });
const calls: [string, () => Promise<unknown>][] = [
  ["list", () => caller.list({ projectId, limit: 20 })],
  ["byIssue", () => caller.byIssue({ projectId, issueNodeId: "I1", boardItemId: "B1" })],
  ["claim", () => caller.claim({ projectId, issueNodeId: "I1", boardItemId: "B1", requestKey })],
  ["claimStatus", () => caller.claimStatus({ projectId, taskId })],
  ["reconcileClaim", () => caller.reconcileClaim({ projectId, taskId, requestKey })],
  ["active", () => caller.active({ projectId, filter: "mine", limit: 20 })],
  ["byTask", () => caller.byTask({ projectId, taskId })],
];

describe("assignedIssues router authentication", () => {
  it.each(calls)("UT-009 %s requires a session", async (_name, call) => {
    await expect(call()).rejects.toMatchObject({ code: "UNAUTHORIZED", cause: { reason: "session_required" } });
  });
});
