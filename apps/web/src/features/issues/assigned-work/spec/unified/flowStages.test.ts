import { describe, expect, it } from "vitest";
import { overviewOf, packageOf, planOf } from "@/test/taskFlow";
import { currentStageIndex, flowStages } from "./flowStages";

const states = (overview: Parameters<typeof flowStages>[0]) => flowStages(overview).map((stage) => stage.state);

describe("flowStages", () => {
  it("waits for the author before anything was started", () => {
    expect(states(overviewOf())).toEqual(["yours", "pending", "pending", "pending", "pending", "pending"]);
  });

  it("marks the spec as running, failed or waiting for review", () => {
    expect(states(overviewOf({ plan: planOf("running") }))[0]).toBe("current");
    expect(states(overviewOf({ plan: planOf("failed") }))[0]).toBe("failed");
    expect(states(overviewOf({ plan: planOf("succeeded"), packages: [packageOf()] })).slice(0, 3)).toEqual(["done", "yours", "pending"]);
  });

  it("keeps the spec approved after the tasks package supersedes it", () => {
    const spec = packageOf({ status: "superseded", approvedAt: "2026-10-06T12:00:00.000Z" });
    const tasks = packageOf({ id: "k2", version: 2, format: "os_tasks_v1" });
    const stages = flowStages(overviewOf({ plan: planOf("succeeded"), packages: [tasks, spec] }));
    expect(stages.map((stage) => stage.state)).toEqual(["done", "done", "done", "yours", "pending", "pending"]);
    expect(currentStageIndex(stages)).toBe(3);
  });

  it("opens the review stage only after every implementation Loop succeeded", () => {
    const tasks = packageOf({ id: "k2", version: 2, format: "os_tasks_v1", status: "approved", approvedAt: "2026-10-06T12:00:00.000Z" });
    const loop = (loopName: string, state: string) => ({ ...planOf("succeeded").actions[0]!, id: loopName, kind: "loop", loopName, state });
    const withLoops = (...actions: unknown[]) => overviewOf({ plan: { ...planOf("succeeded"), actions } as never, packages: [tasks] });
    expect(states(withLoops(loop("implement-tasks", "running"))).slice(4)).toEqual(["current", "pending"]);
    expect(states(withLoops(loop("implement-tasks", "succeeded"))).slice(4)).toEqual(["done", "yours"]);
    expect(states(withLoops(loop("implement-tasks", "succeeded"), loop("review-and-fix", "running"))).slice(4)).toEqual(["done", "current"]);
    expect(states(withLoops(loop("implement-tasks", "succeeded"), loop("review-and-fix", "succeeded"))).slice(4)).toEqual(["done", "done"]);
  });

  it("asks for the next action once the spec is approved", () => {
    const spec = packageOf({ status: "approved", approvedAt: "2026-10-06T12:00:00.000Z" });
    expect(states(overviewOf({ plan: planOf("succeeded"), packages: [spec] }))).toEqual(["done", "done", "yours", "pending", "pending", "pending"]);
  });
});
