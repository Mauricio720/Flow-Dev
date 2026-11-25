import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { taskPublicationAttempts } from "../src/infra/database/schema";
import { closeTaskFixture, seedPublishedIssue, seedTask, taskFixture } from "./task-api-support";

afterEach(closeTaskFixture);

describe("ready assignment task read", () => {
  it("returns null without the option and the stored Ready result when requested", async () => {
    const setup = await taskFixture();
    await seedTask(setup);
    await seedPublishedIssue(setup);
    const attempt = setup.database.update(taskPublicationAttempts).set({ assignToSelf: false }).where(eq(taskPublicationAttempts.taskId, setup.taskId));
    await attempt;
    setup.githubFetcher.mockClear();
    await expect(setup.caller.byId({ projectId: setup.project.id, taskId: setup.taskId })).resolves.toMatchObject({ publication: { readyAssignment: null } });
    await setup.database.update(taskPublicationAttempts).set({ assignToSelf: true, readyAssignment: "ready" }).where(eq(taskPublicationAttempts.taskId, setup.taskId));
    await expect(setup.caller.byId({ projectId: setup.project.id, taskId: setup.taskId })).resolves.toMatchObject({ publication: { readyAssignment: { state: "ready" } } });
    const queries = setup.githubFetcher.mock.calls.map((call) => JSON.parse(String(call[1]?.body)).query as string);
    expect(queries).toHaveLength(2);
    expect(queries.every((query) => query.includes("Repository") && !query.includes("ProjectV2"))).toBe(true);
  });
});
