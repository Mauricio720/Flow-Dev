import { afterEach, describe, expect, it } from "vitest";
import { asc, eq } from "drizzle-orm";
import { taskTerminalEvents, taskTerminalMessages, taskTerminalSessions } from "../src/infra/database/schema";
import type { SessionMessageDao } from "../src/application/terminal/sessionInteractionPorts";
import { createTerminalEventController } from "../src/infra/terminalEventComposition";
import { MAX_STORED_TEXT_LENGTH, TRUNCATION_MARKER } from "../src/application/services/terminal/sessionInteractionLimits";
import { addPublishedTask } from "./planning-support";
import { insertFlowDevSession } from "./session-interaction-support";
import { workerWorld, type WorkerWorld } from "./session-worker-support";
import { FIXTURE_CHECKOUT, hookFixture } from "./terminal-hook-payloads";
import { closeTaskFixture } from "./task-api-support";
import { cleanupTerminalFolders } from "./terminal-support";
import { machineIdentity } from "../src/infra/terminal/machineIdentity";
import { FileSessionContextBuilder } from "../src/infra/terminal/fileSessionContextBuilder";

afterEach(async () => {
  await closeTaskFixture();
  await cleanupTerminalFolders();
});

const messagesOf = (world: WorkerWorld, sessionId: string) => world.setup.database.select().from(taskTerminalMessages).where(eq(taskTerminalMessages.sessionId, sessionId)).orderBy(asc(taskTerminalMessages.occurredAt));
const eventShape = async (world: WorkerWorld, sessionId: string) => {
  const rows = await world.setup.database.select().from(taskTerminalEvents).where(eq(taskTerminalEvents.sessionId, sessionId));
  return rows.map((row) => `${row.kind}|${row.summary}|${row.path}|${row.skill}`).sort();
};

async function run(world: WorkerWorld, sessionId: string) {
  await world.worker.supervisor.tick();
  await world.settle();
  return sessionId;
}

describe("session recorder", () => {
  it("V-27a stores only the main assistant text, never reasoning, tool output or subagent text", async () => {
    const world = await workerWorld({ script: [{ kind: "text", text: "Vou começar pela análise." }, { kind: "thinking", text: "raciocínio secreto" }, { kind: "tool_result", text: "saída do comando" }, { kind: "subagent_text", text: "fala do subagente" }, { kind: "text", text: "Pronto." }] });
    const id = await run(world, await world.open());
    expect((await messagesOf(world, id)).map((row) => [row.role, row.content])).toEqual([["assistant", "Vou começar pela análise."], ["assistant", "Pronto."]]);
  });

  it("V-27a still asks the person when the question comes from a subagent (B-24)", async () => {
    const world = await workerWorld({ script: [{ kind: "ask", questions: [{ question: "Qual?", header: "Q", multiSelect: false, options: [{ label: "A", description: "a" }] }] }, { kind: "subagent_text", text: "oculto" }] });
    const id = await run(world, await world.open());
    expect(world.permissions.requests).toEqual([{ sessionId: id, toolName: "AskUserQuestion" }]);
    expect(await messagesOf(world, id)).toHaveLength(0);
  });

  it("V-27b cuts a 60000-character text at 50000 ending with the marker and flags it (B-29)", async () => {
    const world = await workerWorld({ script: [{ kind: "text", text: "x".repeat(60_000) }, { kind: "text", text: "curto" }] });
    const id = await run(world, await world.open());
    const [long, short] = await messagesOf(world, id);
    expect(long!.content).toHaveLength(MAX_STORED_TEXT_LENGTH);
    expect(long!.content.endsWith(TRUNCATION_MARKER)).toBe(true);
    expect([long!.truncated, short!.truncated, short!.content]).toEqual([true, false, "curto"]);
  });

  it("V-27c writes the same event rows for the Spec B fixtures as the HTTP path does", async () => {
    const names = ["user-prompt-submit-skill", "post-tool-use-skill", "post-tool-use-edit", "post-tool-use-bash", "stop"];
    const payloads = names.map(hookFixture);
    const world = await workerWorld({ script: payloads.map((payload) => ({ kind: "hook" as const, payload })) });
    const id = await world.open();
    await world.setup.client`update task_terminal_sessions set checkout_path = ${FIXTURE_CHECKOUT} where id = ${id}`;
    await run(world, id);
    const [decision] = await world.setup.client`select planning_decision_id as id from task_terminal_sessions where id = ${id}`;
    const legacy = await insertFlowDevSession(world.setup, decision!.id as string, { runtime: "terminal", hostId: null, checkoutPath: FIXTURE_CHECKOUT });
    const http = createTerminalEventController(world.setup.database, { env: world.harness.env });
    const prompt = await new FileSessionContextBuilder(world.harness.env).readPrompt(id);
    const sequence = [{ hook_event_name: "SessionStart", session_id: `claude-${id}`, cwd: world.clone, source: "startup" }, { hook_event_name: "UserPromptSubmit", session_id: `claude-${id}`, cwd: world.clone, prompt }, ...payloads];
    for (const payload of sequence) await http.ingest(legacy.id, payload);
    const expected = await eventShape(world, legacy.id);
    expect(expected.length).toBeGreaterThan(6);
    expect(await eventShape(world, id)).toEqual(expected);
  });

  it("V-27f keeps the script running to the end when the messages table refuses writes, and logs it", async () => {
    const failing = { insertAssistantMessage: async () => { throw new Error("banco recusou"); } } as unknown as SessionMessageDao;
    const world = await workerWorld({ script: [{ kind: "text", text: "um" }, { kind: "text", text: "dois" }, { kind: "end_turn" }] }, { messages: failing });
    const id = await run(world, await world.open());
    expect(world.log.entries.filter((entry) => entry.event === "record_text_failed")).toHaveLength(2);
    expect(world.log.entries.find((entry) => entry.event === "record_text_failed")!.fields).toMatchObject({ error: "banco recusou" });
    const [session] = await world.setup.database.select().from(taskTerminalSessions).where(eq(taskTerminalSessions.id, id));
    expect(session!.status).toBe("waiting");
  });

  it("B-31 keeps the text of two active sessions of the same person in their own session", async () => {
    const world = await workerWorld({ script: ({ sessionId }) => [{ kind: "text", text: `texto de ${sessionId}` }] });
    const first = await world.open();
    const otherTask = await addPublishedTask(world.setup);
    const [decision] = await world.setup.client`select planning_decision_id as id from task_terminal_sessions where id = ${first}`;
    const second = await insertFlowDevSession(world.setup, decision!.id as string, { taskId: otherTask, hostId: machineIdentity(), checkoutPath: world.clone });
    const builder = new FileSessionContextBuilder(world.harness.env);
    await builder.prepare(second.id);
    await builder.writePrompt(second.id, "segunda sessão");
    await run(world, first);
    expect((await messagesOf(world, first)).map((row) => row.content)).toEqual([`texto de ${first}`]);
    expect((await messagesOf(world, second.id)).map((row) => row.content)).toEqual([`texto de ${second.id}`]);
  });
});
