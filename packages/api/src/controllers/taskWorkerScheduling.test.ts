import { describe, expect, it } from "vitest";
import { TaskWorkerController } from "./taskWorkerController";

const WORKER_ID = "00000000-0000-4000-8000-000000000001";

function counted() {
  const visits: string[] = [];
  const operations = { claim: async () => { visits.push("generate"); return null; }, generationInput: async () => { throw new Error("unused"); }, heartbeat: async () => {} };
  const publications = { tick: async () => { visits.push("publish"); return true; } };
  const planning = { tick: async () => { visits.push("plan"); return true; } };
  return { visits, controller: new TaskWorkerController(operations as never, {} as never, WORKER_ID, publications as never, planning as never) };
}

describe("TaskWorkerController scheduling", () => {
  it("UT-030 visits publish and plan before repeating a kind", async () => {
    const { controller, visits } = counted();
    for (let turn = 0; turn < 4; turn += 1) await controller.tick();
    expect(visits.filter((kind) => kind !== "generate").slice(0, 4)).toEqual(["publish", "plan", "publish", "plan"]);
  });

  it("falls through idle kinds and rotates after generation work", async () => {
    const visits: string[] = [];
    let queued = 2;
    const operations = { claim: async () => queued-- > 0 ? { operationId: "o" } : null, generationInput: async () => { throw new Error("boom"); }, heartbeat: async () => {}, failGeneration: async () => { visits.push("generated"); } };
    const planning = { tick: async () => { visits.push("plan"); return true; } };
    const controller = new TaskWorkerController(operations as never, {} as never, WORKER_ID, undefined, planning as never);
    await controller.tick();
    await controller.tick();
    expect(visits).toEqual(["generated", "plan"]);
  });

  it("UT-031 runs at most two handlers in one process", async () => {
    let inFlight = 0;
    let peak = 0;
    let remaining = 8;
    const abort = new AbortController();
    const operations = { claim: async () => remaining > 0 ? (remaining--, { operationId: "o" }) : null, generationInput: async () => { inFlight += 1; peak = Math.max(peak, inFlight); await new Promise((resolve) => setTimeout(resolve, 20)); inFlight -= 1; throw new Error("done"); }, heartbeat: async () => {}, failGeneration: async () => { if (remaining === 0) abort.abort(); } };
    const controller = new TaskWorkerController(operations as never, {} as never, WORKER_ID);
    await controller.runPool(abort.signal);
    expect(peak).toBe(2);
  });
});
