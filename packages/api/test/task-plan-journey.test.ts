import { afterEach, describe, expect, it } from "vitest";
import { manifestWith } from "../src/application/services/tasks-set/manifestFixture";
import { taskFileWith } from "../src/application/services/tasks-set/taskFileFixture";
import type { ScriptStep } from "../src/infra/terminal/scriptedSessionSteps";
import { FOLDER, T10 } from "./plan-support";
import { cycle, workerWorld } from "./session-worker-support";
import { closeTaskFixture } from "./task-api-support";
import { seedVersions } from "./task-set-support";
import { cleanupTerminalFolders, openInput } from "./terminal-support";

afterEach(async () => {
  await closeTaskFixture();
  await cleanupTerminalFolders();
});

const SONNET_HIGH = { agent: "claude", model: "sonnet", effort: "high" } as const;
const OPUS_MAX = { agent: "claude", model: "opus", effort: "max" } as const;
const writeTask = (number: string, status: string, done: boolean): ScriptStep => ({ kind: "write_file", path: `${FOLDER}/task_${number}.md`, content: taskFileWith({ status, title: `Tarefa ${number}`, minis: [done, done, done] }) });
const MANIFEST = manifestWith({ ids: ["task_01", "task_02"], edges: [["task_01", "task_02"]] });
const GENERATION: ScriptStep[] = [{ kind: "write_file", path: `${FOLDER}/_tasks.md`, content: MANIFEST }, writeTask("01", "pending", false), writeTask("02", "pending", false), { kind: "end_turn" }];
const EXECUTE_ONE: ScriptStep[] = [writeTask("01", "completed", true), { kind: "end_turn" }];
const EXECUTE_TWO: ScriptStep[] = [writeTask("02", "completed", true), { kind: "end_turn" }];

describe("task plan journey: generate, plan, execute", () => {
  it("V-41 generates the tasks, plans one session per task, runs the first and releases the second", async () => {
    let script: ScriptStep[] = GENERATION;
    const world = await workerWorld({ script: () => script }, { permissions: undefined });
    const { caller } = world.harness;
    const scope = { projectId: world.setup.project.id, taskId: world.setup.taskId };
    const spec = await seedVersions(world.setup, { path: `${FOLDER}/spec.md`, versions: [{ skill: "spec-writer", content: "# Spec", at: T10 }] });

    const generation = await caller.terminal.preflight({ ...scope, purpose: { kind: "generate_tasks" } });
    expect(generation.prompt).toBe(`/flow-dev:spec-to-tasks Quebre em tarefas a spec ${FOLDER}/spec.md. Salve os arquivos na pasta dela e pare para minha revisão. Não implemente.`);
    const generated = await caller.terminal.open({ ...openInput(world.setup, { prompt: generation.prompt }), purpose: { kind: "generate_tasks", specArtifactId: spec.id, choice: OPUS_MAX } });
    await cycle(world);
    const afterGeneration = await caller.taskSet.get(scope);
    expect(afterGeneration.set!.tasks.map((task) => [task.id, task.status, task.dependsOn])).toEqual([["task_01", "pending", []], ["task_02", "pending", ["task_01"]]]);
    expect(world.runtime.starts[0]).toMatchObject({ sessionId: generated.sessionId, model: "opus", effort: "max" });

    const empty = await caller.plan.get(scope);
    expect(empty).toMatchObject({ version: 0, unassigned: ["task_01", "task_02"] });
    await caller.plan.save({ ...scope, version: 0, items: [{ taskIds: ["task_01"], choice: OPUS_MAX }, { taskIds: ["task_02"], choice: SONNET_HIGH }] });
    const planned = await caller.plan.get(scope);
    expect(planned.items.map((item) => [item.taskIds, item.state, item.blockedBy, item.choice.model])).toEqual([[["task_01"], "ready", [], "opus"], [["task_02"], "blocked", [{ taskId: "task_01", status: "pending" }], "sonnet"]]);

    script = EXECUTE_ONE;
    const first = planned.items[0]!;
    const executionPrompt = (await caller.terminal.preflight({ ...scope, purpose: { kind: "plan_item", planItemId: first.id } })).prompt;
    await caller.terminal.open({ ...openInput(world.setup, { prompt: executionPrompt }), purpose: { kind: "plan_item", planItemId: first.id } });
    await cycle(world);
    const afterFirst = await caller.plan.get(scope);
    expect((await caller.taskSet.get(scope)).set!.tasks[0]).toMatchObject({ id: "task_01", status: "completed", miniDone: 3, miniTotal: 3 });
    expect(afterFirst.items.map((item) => item.state)).toEqual(["done", "ready"]);

    script = EXECUTE_TWO;
    const second = afterFirst.items[1]!;
    await caller.terminal.open({ ...openInput(world.setup), purpose: { kind: "plan_item", planItemId: second.id } });
    await cycle(world);
    expect(world.runtime.starts.at(-1)).toMatchObject({ model: "sonnet", effort: "high" });
    expect((await caller.plan.get(scope)).items.map((item) => item.state)).toEqual(["done", "done"]);
  });
});
