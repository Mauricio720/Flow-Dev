import { describe, expect, it } from "vitest";
import { actionOffers } from "./actionOffers";

const gate = (approved: boolean) => ({ approvedSpec: async () => approved });

describe("actionOffers", () => {
  it("offers only direct execution on the direct route", async () => {
    await expect(actionOffers({ gate: gate(false), taskId: "t1", plannable: true, route: "direct" })).resolves.toEqual([{ kind: "direct_execute", available: true }]);
  });

  it("offers the spec pipeline on a spec route", async () => {
    await expect(actionOffers({ gate: gate(true), taskId: "t1", plannable: true, route: "spec" })).resolves.toEqual([{ kind: "create_spec", available: true }, { kind: "create_tasks", available: true }]);
    await expect(actionOffers({ gate: gate(true), taskId: "t1", plannable: false })).resolves.toEqual([{ kind: "create_spec", available: false }, { kind: "create_tasks", available: false }]);
  });
});
