import { afterEach, describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import { fixture, type Fixture } from "./fixture";
import { users } from "../src/infra/database/schema";
import { createProjectsRouter } from "../src/routers/projects";
import { AgentSettingsController } from "../src/controllers/agentSettingsController";
import { AgentSettingsService } from "../src/application/services/projects/agentSettingsService";
import { DrizzleAgentSettingsDao } from "../src/infra/database/dao/projects/drizzleAgentSettingsDao";

let state: Fixture | undefined;
afterEach(async () => { await state?.close(); state = undefined; });

async function setup() {
  state = await fixture();
  const project = await state.project();
  const service = new AgentSettingsService(new DrizzleAgentSettingsDao(state.database), state.dao, state.permissions);
  const router = createProjectsRouter(state.controller, new AgentSettingsController(service));
  const caller = (userId: string) => router.createCaller({ principal: { userId }, requestId: "integration" });
  await state.permissions.assign(state.member.id, project.id, state.admin.id);
  return { state, project, caller };
}

const planningCodex = { agent: "planning" as const, provider: "codex" as const, model: "gpt-6.1-sol", effort: "medium" as const, expectedVersion: 0 };

async function failureOf(promise: Promise<unknown>) {
  const error = await promise.then(() => null, (caught: unknown) => caught);
  expect(error).toBeInstanceOf(TRPCError);
  return error as TRPCError;
}

describe("projects.agentSettings", () => {
  it("V-08a lets an admin save the planning agent while the author keeps the default", async () => {
    const { state, project, caller } = await setup();
    const saved = await caller(state.admin.id).agentSettings.update({ projectId: project.id, ...planningCodex });
    expect(saved).toMatchObject({ agent: "planning", provider: "codex", version: 1, isDefault: false });
    const read = await caller(state.admin.id).agentSettings.get({ projectId: project.id });
    expect(read.agents.find((item) => item.agent === "issue_author")).toMatchObject({ isDefault: true, provider: "claude" });
    expect(read.catalog.codex).toEqual(["gpt-6.1-sol"]);
  });

  it("V-08b refuses a member and stores nothing", async () => {
    const { state, project, caller } = await setup();
    const error = await failureOf(caller(state.member.id).agentSettings.update({ projectId: project.id, ...planningCodex }));
    expect(error.code).toBe("FORBIDDEN");
    const read = await caller(state.admin.id).agentSettings.get({ projectId: project.id });
    expect(read.agents.every((item) => item.isDefault)).toBe(true);
  });

  it("V-08e shows a member both agents and hides the project from an outsider", async () => {
    const { state, project, caller } = await setup();
    expect((await caller(state.member.id).agentSettings.get({ projectId: project.id })).agents).toHaveLength(2);
    const [outsider] = await state.database.insert(users).values({ name: "Out", email: "out@test.invalid" }).returning();
    const error = await failureOf(caller(outsider!.id).agentSettings.get({ projectId: project.id }));
    expect(error.code).toBe("NOT_FOUND");
  });

  it("V-08h rejects an effort outside low, medium and high at the input schema", async () => {
    const { state, project, caller } = await setup();
    const error = await failureOf(caller(state.admin.id).agentSettings.update({ projectId: project.id, ...planningCodex, effort: "max" as never }));
    expect(error.code).toBe("BAD_REQUEST");
  });

  it("rejects a model from another provider with the catalog message", async () => {
    const { state, project, caller } = await setup();
    const error = await failureOf(caller(state.admin.id).agentSettings.update({ projectId: project.id, ...planningCodex, provider: "claude" }));
    expect(error).toMatchObject({ code: "BAD_REQUEST", message: "Escolha um modelo e um esforço disponíveis para este provedor." });
  });

  it("V-08k answers a stale version with CONFLICT and the conflict reason", async () => {
    const { state, project, caller } = await setup();
    await caller(state.admin.id).agentSettings.update({ projectId: project.id, ...planningCodex });
    const error = await failureOf(caller(state.admin.id).agentSettings.update({ projectId: project.id, ...planningCodex, effort: "high" }));
    expect(error.code).toBe("CONFLICT");
    expect(error.message).toBe("A configuração mudou desde que você abriu a página. Recarregue para ver a versão atual.");
    expect(error.cause).toMatchObject({ reason: "agent_settings_conflict" });
  });

  it("B-09 refuses the write once the admin designation is gone", async () => {
    const { state, project, caller } = await setup();
    await state.permissions.replaceAdmins([]);
    const error = await failureOf(caller(state.admin.id).agentSettings.update({ projectId: project.id, ...planningCodex }));
    expect(error.code).toBe("FORBIDDEN");
  });
});
