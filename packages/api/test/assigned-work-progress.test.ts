import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { issue } from "./assigned-world";
import { assignedFixture, closeAssigned, resetAssigned, type AssignedFixture } from "./assigned-support";

let f: AssignedFixture;
beforeAll(async () => { f = await assignedFixture(); });
beforeEach(() => resetAssigned(f));
afterAll(closeAssigned);

const firstProgress = async () => (await f.caller(f.u1.id).active({ projectId: f.project.id, filter: "mine", limit: 20 })).items[0]!.progress;

describe("assignedIssues.active progress", () => {
  it("reports no route for claimed work that has not been planned", async () => {
    await f.caller(f.u1.id).claim(f.claimInput());
    expect(await firstProgress()).toEqual({ route: null, execution: null });
  });

  it("IT-011 pages active progress for 120 tasks from stored state", async () => {
    for (let index = 0; index < 120; index += 1) {
      const itemId = `PVTI_progress_${index}`;
      const number = 5000 + index;
      f.world.add({ id: itemId, issue: issue(number, [88]) });
      await f.caller(f.u1.id).claim({ projectId: f.project.id, issueNodeId: `I_fixture_${number}`, boardItemId: itemId, requestKey: crypto.randomUUID() });
    }
    const callsBeforeRead = f.world.fetcher.mock.calls.length;
    const page = await f.caller(f.u1.id).active({ projectId: f.project.id, filter: "mine", limit: 50 });
    expect(page.items).toHaveLength(50);
    expect(page.items[0]?.progress).toMatchObject({ route: null, execution: null });
    expect(f.world.fetcher.mock.calls).toHaveLength(callsBeforeRead);
  }, 60_000);
});
