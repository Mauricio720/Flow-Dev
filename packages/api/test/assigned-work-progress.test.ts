import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { assignedFixture, closeAssigned, resetAssigned, type AssignedFixture } from "./assigned-support";

let f: AssignedFixture;
beforeAll(async () => { f = await assignedFixture(); });
beforeEach(() => resetAssigned(f));
afterAll(closeAssigned);

const firstProgress = async () => (await f.caller(f.u1.id).active({ projectId: f.project.id, filter: "mine", limit: 20 })).items[0]!.progress;

describe("assignedIssues.active progress", () => {
  it("reports no route for claimed work that has not been planned", async () => {
    await f.caller(f.u1.id).claim(f.claimInput());
    expect(await firstProgress()).toEqual({ route: null });
  });
});
