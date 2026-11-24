import { afterEach, describe, expect, it } from "vitest";
import { OPUS_MAX, seedItemSession, seedStoredPlan, seedTaskSet, setTaskStatus, T10, T11 } from "./plan-support";
import { seedVersions } from "./task-set-support";
import { closeTaskFixture } from "./task-api-support";
import { readySetup } from "./terminal-open-support";
import { cleanupTerminalFolders } from "./terminal-support";

afterEach(async () => {
  await closeTaskFixture();
  await cleanupTerminalFolders();
});

const HAIKU_MEDIUM = { agent: "claude", model: "haiku", effort: "medium" } as const;
const CODEX_UNAVAILABLE = "O catálogo do Codex ainda não foi publicado.";
const scopeOf = (world: Awaited<ReturnType<typeof readySetup>>) => ({ projectId: world.setup.project.id, taskId: world.setup.taskId });

describe("tasks.terminal.preflight with a purpose", () => {
  it("V-37f builds the generation prompt for the newest spec, or for the one chosen, with the default choice and the agents", async () => {
    const world = await readySetup();
    const older = await seedVersions(world.setup, { path: "docs/specs/a/spec.md", versions: [{ skill: "spec-writer", content: "a", at: T10 }] });
    await seedVersions(world.setup, { path: "docs/specs/b/spec.md", versions: [{ skill: "spec-writer", content: "b", at: T11 }] });
    const newest = await world.harness.caller.terminal.preflight({ ...scopeOf(world), purpose: { kind: "generate_tasks" } });
    expect(newest.prompt).toBe("/flow-dev:spec-to-tasks Quebre em tarefas a spec docs/specs/b/spec.md. Salve os arquivos na pasta dela e pare para minha revisão. Não implemente.");
    expect(newest.choice).toEqual(OPUS_MAX);
    expect(newest.agents).toEqual([
      { agent: "claude", available: true, reason: null, models: ["opus", "sonnet", "haiku"], efforts: ["low", "medium", "high", "xhigh", "max"] },
      { agent: "codex", available: false, reason: CODEX_UNAVAILABLE, models: [], efforts: [], modelOptions: [] },
    ]);
    const chosen = await world.harness.caller.terminal.preflight({ ...scopeOf(world), purpose: { kind: "generate_tasks", specArtifactId: older.id } });
    expect(chosen.prompt).toContain("docs/specs/a/spec.md");
  });

  it("V-37f returns the default choice for a legacy route preflight", async () => {
    const world = await readySetup();
    const route = await world.harness.caller.terminal.preflight(scopeOf(world));
    expect(route.prompt).toBe(route.defaultPrompt);
    expect(route.choice).toEqual(OPUS_MAX);
    expect(route.agents).toHaveLength(2);
  });

  it("previews an explicitly selected route choice", async () => {
    const world = await readySetup();
    const choice = { agent: "claude" as const, model: "haiku", effort: "medium" };
    const route = await world.harness.caller.terminal.preflight({ ...scopeOf(world), purpose: { kind: "route", choice } });
    expect(route.choice).toEqual(choice);
  });

  it("V-37g builds the execution prompt with the tasks of the item, and only the open ones for a new try", async () => {
    const world = await readySetup();
    await seedTaskSet(world, { ids: ["task_01", "task_02", "task_03"] });
    const { items } = await seedStoredPlan(world, { items: [{ taskIds: ["task_01", "task_02"], choice: HAIKU_MEDIUM }] });
    const purpose = { kind: "plan_item" as const, planItemId: items[0]!.id };
    const first = await world.harness.caller.terminal.preflight({ ...scopeOf(world), purpose });
    expect(first.prompt).toContain("as tarefas docs/specs/login/task_01.md, docs/specs/login/task_02.md de docs/specs/login.");
    expect(first.choice).toEqual(HAIKU_MEDIUM);
    await seedItemSession(world, { itemId: items[0]!.id, status: "ended" });
    await setTaskStatus(world, "task_01", "completed");
    const again = await world.harness.caller.terminal.preflight({ ...scopeOf(world), purpose });
    expect(again.prompt).toContain("as tarefas docs/specs/login/task_02.md de docs/specs/login.");
    expect(again.prompt).not.toContain("task_01.md");
  });

  it("refuses a generation preflight without a spec, and an item that does not exist", async () => {
    const world = await readySetup();
    const refusal = (purpose: Record<string, unknown>) => world.harness.caller.terminal.preflight({ ...scopeOf(world), purpose: purpose as never }).then(() => null, (error: { cause?: { reason: string } }) => error.cause?.reason);
    expect(await refusal({ kind: "generate_tasks" })).toBe("spec_not_found");
    await seedTaskSet(world, { ids: ["task_01"] });
    expect(await refusal({ kind: "plan_item", planItemId: crypto.randomUUID() })).toBe("plan_item_not_ready");
  });
});
