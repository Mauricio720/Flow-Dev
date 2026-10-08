import { describe, expect, it } from "vitest";
import type { FlowAction } from "./flowContracts";
import { implementationConcluded, reviewFollowsImplementation } from "./loopOrder";
import { assertPlanShape } from "./planShape";

const RUNTIME = { connectionId: "c1", providerId: "codex", modelId: "gpt-5.6-sol", reasoningEffort: null };
const loop = (loopName: string): FlowAction => ({ kind: "loop", loopName, loopVersion: "0", inputs: {}, runtimeBindings: { worker: RUNTIME }, workspace: { kind: "local" } });
const step = (loopName: string, state: string) => ({ kind: "loop", loopName, state });

describe("review after implementation", () => {
  it("accepts a review Loop only when an implementation Loop comes before it in the plan", () => {
    expect(reviewFollowsImplementation([loop("implement-tasks"), loop("review-and-fix")])).toBe(true);
    expect(reviewFollowsImplementation([loop("implement-tasks")])).toBe(true);
    expect(() => assertPlanShape([loop("review-and-fix")])).toThrowError(expect.objectContaining({ reason: "stage_prerequisite" }));
    expect(() => assertPlanShape([loop("review-and-fix"), loop("implement-tasks")])).toThrowError(expect.objectContaining({ reason: "stage_prerequisite" }));
    expect(() => assertPlanShape([loop("implement-tasks"), loop("review-and-fix")])).not.toThrow();
  });

  it("treats the implementation as concluded only after its Loop succeeded", () => {
    expect(implementationConcluded([step("implement-tasks", "succeeded")])).toBe(true);
    expect(implementationConcluded([step("implement-tasks", "failed")])).toBe(false);
    expect(implementationConcluded([step("other-loop", "succeeded")])).toBe(false);
  });
});
