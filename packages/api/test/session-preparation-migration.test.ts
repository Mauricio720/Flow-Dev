import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { taskTerminalSessions } from "../src/infra/database/schema";
import { applyMigration } from "./database";
import { closeTaskFixture } from "./task-api-support";
import { world } from "./terminal-tracking-support";

afterEach(closeTaskFixture);

describe("0049 session preparation migration", () => {
  it("backfills existing opening sessions and supports rollback and reapplication", async () => {
    const { setup, decisionId } = await world();
    await applyMigration(setup.client, "0049_session_preparation_rollback");
    const id = crypto.randomUUID();
    await setup.client`insert into task_terminal_sessions (id, task_id, project_id, user_id, planning_decision_id, route, request_key, checkout_path, dirty, status, opened_at) values (${id}, ${setup.taskId}, ${setup.project.id}, ${setup.ownerId}, ${decisionId}, 'tech_spec', ${crypto.randomUUID()}, '/work/shop', false, 'opening', '2026-11-23T14:32:00Z')`;
    await applyMigration(setup.client, "0049_session_preparation");
    const [row] = await setup.database.select().from(taskTerminalSessions).where(eq(taskTerminalSessions.id, id));
    expect(row?.preparedAt).toEqual(row?.openedAt);
    await applyMigration(setup.client, "0049_session_preparation_rollback");
    await applyMigration(setup.client, "0049_session_preparation");
  });
});
