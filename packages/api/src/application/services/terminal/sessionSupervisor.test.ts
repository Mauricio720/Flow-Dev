import { describe, expect, it } from "vitest";
import type { HeartbeatStep } from "./heartbeatStep";
import type { SessionLog, SessionLogFields } from "./sessionLog";
import { SessionSupervisor } from "./sessionSupervisor";
import type { TickStep } from "./sessionTickStep";

function stepNamed(name: string, order: string[], failure?: Error): TickStep {
  return { name, run: async () => { order.push(name); if (failure) throw failure; } };
}

describe("SessionSupervisor.tick", () => {
  it("runs the heartbeat first, keeps running the next steps after one fails and logs the failure", async () => {
    const order: string[] = [];
    const errors: Array<[string, SessionLogFields | undefined]> = [];
    const log: SessionLog = { info: () => undefined, error: (event, fields) => errors.push([event, fields]) };
    const heartbeat = stepNamed("heartbeat", order) as unknown as HeartbeatStep;
    const supervisor = new SessionSupervisor({ heartbeat, steps: [stepNamed("a", order, new Error("banco fora")), stepNamed("b", order)], log });
    await supervisor.tick();
    expect(order).toEqual(["heartbeat", "a", "b"]);
    expect(errors).toEqual([["step_failed", { step: "a", error: "banco fora" }]]);
  });
});
