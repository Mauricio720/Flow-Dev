import { describe, expect, it } from "vitest";
import type { PlannedAction } from "../../database/dao/taskFlowDao";
import type { SkillFlowAction } from "./flowContracts";
import { fromPlannedAction, toPlannedAction } from "./planProposal";

const runtime = { connectionId: "c1", providerId: "codex", modelId: "gpt", reasoningEffort: null };
const action: SkillFlowAction = { kind: "create_spec", language: "en", runtime, workspace: { kind: "isolated" } };

describe("skill action language", () => {
  it("round-trips the selected language through persisted action inputs", () => {
    const stored = toPlannedAction(action, 1);
    expect(stored.inputs).toEqual({ language: "en" });
    expect(fromPlannedAction(stored)).toMatchObject({ kind: "create_spec", language: "en" });
  });

  it("reads plans created before language selection as pt-BR", () => {
    const stored = { ...toPlannedAction(action, 1), inputs: {} } as PlannedAction;
    expect(fromPlannedAction(stored)).toMatchObject({ language: "pt-BR" });
  });
});
