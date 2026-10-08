import { describe, expect, it } from "vitest";
import type { RunRecord } from "../../application/database/dao/taskFlowDao";
import type { RunActivity } from "../../application/database/dao/taskFlowTypes";
import { takeRuntimeActivity } from "./localActivityUpdate";

const activity: RunActivity = { sequence: 12, at: "2026-10-08T19:58:58Z", kind: "agent_message", preview: "Validando a tarefa 3", source: null, tool: null, status: null };

describe("local activity updates", () => {
  it("reports each update once while advancing the session cursor", () => {
    const run = {} as RunRecord;
    const result = { state: "running" as const, code: null, activity, runtimeEventSequence: 12 };
    expect(takeRuntimeActivity(run, result)).toEqual(activity);
    expect(takeRuntimeActivity(run, { ...result, activity: { ...activity } })).toBeNull();
    expect(run.runtimeEventSequence).toBe(12);
    expect(takeRuntimeActivity(run, { ...result, activity: { ...activity, preview: "Tarefa concluída" } })).not.toBeNull();
  });
});
