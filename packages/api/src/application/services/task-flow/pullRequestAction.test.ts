import { describe, expect, it } from "vitest";
import type { FlowAction } from "./flowContracts";
import { assertPullRequestShape, reviewPassedCleanly } from "./pullRequestAction";
import { TaskFlowError } from "./taskFlowErrors";

const runtime = { connectionId: "c1", providerId: "claude", modelId: "model-1", reasoningEffort: null };
const local: FlowAction["workspace"] = { kind: "local" };
const loop = (loopName: string, workspace: FlowAction["workspace"] = local): FlowAction => ({ kind: "loop", loopName, loopVersion: "1", inputs: {}, runtimeBindings: { main: runtime }, workspace });
const publish = (workspace: FlowAction["workspace"] = local): FlowAction => ({ kind: "open_pull_request", language: "pt-BR", runtime, workspace });
const implement = loop("implement-tasks");
const review = loop("review-and-fix");

describe("pull request action shape", () => {
  it("accepts publication as the last action after a Review in the local project", () => {
    expect(() => assertPullRequestShape([implement, review, publish()])).not.toThrow();
    expect(() => assertPullRequestShape([implement, review])).not.toThrow();
  });

  it("rejects publication that is repeated or not the last action", () => {
    expect(() => assertPullRequestShape([implement, review, publish(), publish()])).toThrowError(new TaskFlowError("invalid_input"));
    expect(() => assertPullRequestShape([implement, publish(), review])).toThrowError(new TaskFlowError("invalid_input"));
  });

  it("rejects publication without a Review before it", () => {
    expect(() => assertPullRequestShape([implement, publish()])).toThrowError(new TaskFlowError("stage_prerequisite"));
  });

  it("keeps publication and the code it publishes in the local project", () => {
    const localRequired = new TaskFlowError("worktree_not_ready", undefined, { cause: "local_required" });
    expect(() => assertPullRequestShape([implement, review, publish({ kind: "isolated" })])).toThrowError(localRequired);
    expect(() => assertPullRequestShape([loop("implement-tasks", { kind: "isolated" }), review, publish()])).toThrowError(localRequired);
  });
});

describe("reviewPassedCleanly", () => {
  const step = (state: string, concludedAt: Date | null = null) => ({ kind: "loop", loopName: "review-and-fix", state, concludedAt });

  it("releases publication only after every Review succeeded on its own", () => {
    expect(reviewPassedCleanly([step("succeeded")])).toBe(true);
    expect(reviewPassedCleanly([step("succeeded"), step("failed")])).toBe(false);
    expect(reviewPassedCleanly([])).toBe(false);
  });

  it("does not release publication when the operator concluded the Review by hand", () => {
    expect(reviewPassedCleanly([step("succeeded", new Date())])).toBe(false);
  });
});
