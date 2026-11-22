import { afterEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { fixture, type Fixture } from "./fixture";
import { DrizzleAgentSettingsDao } from "../src/infra/database/dao/projects/drizzleAgentSettingsDao";

let state: Fixture | undefined;
afterEach(async () => { await state?.close(); state = undefined; });

async function setup() {
  state = await fixture();
  const project = await state.project();
  return { project, state, dao: new DrizzleAgentSettingsDao(state.database) };
}

const planningCodex = { agent: "planning" as const, provider: "codex" as const, model: "gpt-6.1-sol", effort: "medium" as const };

describe("agent settings DAO", () => {
  it("V-08d keeps the first of two writes that expect the same version", async () => {
    const { project, state, dao } = await setup();
    const first = await dao.save({ ...planningCodex, projectId: project.id, expectedVersion: 0, updatedBy: state.admin.id });
    expect(first?.version).toBe(1);
    const winner = await dao.save({ ...planningCodex, effort: "high", projectId: project.id, expectedVersion: 1, updatedBy: state.admin.id });
    const loser = await dao.save({ ...planningCodex, effort: "low", projectId: project.id, expectedVersion: 1, updatedBy: state.admin.id });
    expect(winner).toMatchObject({ version: 2, effort: "high" });
    expect(loser).toBeNull();
    expect(await dao.find(project.id, "planning")).toMatchObject({ version: 2, effort: "high", updatedBy: state.admin.id });
  });

  it("V-08i refuses a first write when the row already exists", async () => {
    const { project, state, dao } = await setup();
    await dao.save({ ...planningCodex, projectId: project.id, expectedVersion: 0, updatedBy: state.admin.id });
    const again = await dao.save({ ...planningCodex, effort: "low", projectId: project.id, expectedVersion: 0, updatedBy: state.admin.id });
    expect(again).toBeNull();
    expect((await dao.find(project.id, "planning"))?.effort).toBe("medium");
  });

  it("V-08f drops the row with its project and lists nothing for a project without settings", async () => {
    const { project, state, dao } = await setup();
    await dao.save({ ...planningCodex, projectId: project.id, expectedVersion: 0, updatedBy: state.admin.id });
    expect(await dao.list(project.id)).toHaveLength(1);
    await state.database.execute(sql`delete from projects where id = ${project.id}`);
    expect(await dao.list(project.id)).toEqual([]);
  });

  it("stores a model outside the catalog so a retired model stays readable", async () => {
    const { project, state, dao } = await setup();
    const saved = await dao.save({ ...planningCodex, provider: "claude", model: "gpt-antigo", projectId: project.id, expectedVersion: 0, updatedBy: state.admin.id });
    expect(saved?.model).toBe("gpt-antigo");
  });

  it("rejects an agent outside issue_author and planning at the database", async () => {
    const { project, state } = await setup();
    const insert = state.client`insert into project_agent_settings(project_id, agent, provider, model, effort) values (${project.id}, 'qa', 'claude', 'sonnet', 'low')`;
    await expect(insert).rejects.toThrow();
  });
});
