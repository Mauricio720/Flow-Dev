import { writeFile } from "node:fs/promises";
import { createSessionWorker, type WorkerOverrides } from "../src/infra/sessionWorkerComposition";
import type { SessionLog, SessionLogFields } from "../src/application/services/terminal/sessionLog";
import type { SessionPermissions } from "../src/application/services/terminal/sessionPermissions";
import { ScriptedSessionRuntime, type ScriptedRuntimeOptions } from "../src/infra/terminal/scriptedSessionRuntime";
import { machineIdentity } from "../src/infra/terminal/machineIdentity";
import { readySetup } from "./terminal-open-support";
import type { HarnessOptions } from "./terminal-harness";
import { openInput } from "./terminal-support";
import { asc, eq } from "drizzle-orm";
import { taskTerminalMessages } from "../src/infra/database/schema";
import { scriptFileFor, type ScriptStep } from "../src/infra/terminal/scriptedSessionSteps";
import type { SessionPurposeKind } from "../src/application/terminal/sessionPurposeKind";

export class ControlledClock {
  constructor(private current: Date = new Date("2026-11-23T17:32:00Z")) {}
  now = () => new Date(this.current);
  advance(ms: number) {
    this.current = new Date(this.current.getTime() + ms);
  }
}

export class RecordingLog implements SessionLog {
  readonly entries: Array<{ level: "info" | "error"; event: string; fields: SessionLogFields }> = [];
  info(event: string, fields: SessionLogFields = {}) {
    this.entries.push({ level: "info", event, fields });
  }
  error(event: string, fields: SessionLogFields = {}) {
    this.entries.push({ level: "error", event, fields });
  }
  events(level: "info" | "error") {
    return this.entries.filter((entry) => entry.level === level).map((entry) => entry.event);
  }
}

export class RecordingPermissions implements SessionPermissions {
  readonly requests: Array<{ sessionId: string; toolName: string }> = [];
  async handle(session: { id: string }, request: { toolName: string; input: Record<string, unknown> }) {
    this.requests.push({ sessionId: session.id, toolName: request.toolName });
    return { behavior: "allow" as const, updatedInput: request.input };
  }
}

export type WorkerWorld = Awaited<ReturnType<typeof workerWorld>>;

export async function workerWorld(runtimeOptions: ScriptedRuntimeOptions = {}, overrides: Partial<WorkerOverrides> = {}, harnessOptions: HarnessOptions = {}) {
  const world = await readySetup(harnessOptions);
  const clock = new ControlledClock();
  const log = new RecordingLog();
  const runtime = new ScriptedSessionRuntime(runtimeOptions);
  const permissions = new RecordingPermissions();
  const build = (extra: Partial<WorkerOverrides> = {}) => createSessionWorker(world.setup.database, { runtimes: { claude: runtime }, env: world.harness.env, now: clock.now, hostId: machineIdentity(), workerId: "worker-1", log, permissions, ...overrides, ...extra });
  const worker = build();
  const open = (overrides: Record<string, unknown> = {}) => world.harness.caller.terminal.open(openInput(world.setup, overrides)).then((result) => result.sessionId);
  const settle = async () => {
    for (let round = 0; round < 3; round += 1) {
      await Promise.all([...runtime.runners.values()].map((runner) => runner.settled()));
      await worker.idle();
    }
  };
  return { ...world, clock, log, runtime, permissions, worker, build, open, settle };
}

export const cycle = async (world: Pick<WorkerWorld, "worker" | "settle">) => {
  await world.worker.supervisor.tick();
  await world.settle();
};

export const NOTE_TIME = "14:32";

export const brokerWorld = (script: ScriptStep[], runtime: ScriptedRuntimeOptions = {}) => workerWorld({ script, ...runtime }, { permissions: undefined });

export const scopeOf = (world: WorkerWorld, sessionId: string) => ({ projectId: world.setup.project.id, taskId: world.setup.taskId, sessionId });

export const messagesOf = (world: WorkerWorld, sessionId: string) => world.setup.database.select().from(taskTerminalMessages).where(eq(taskTerminalMessages.sessionId, sessionId)).orderBy(asc(taskTerminalMessages.occurredAt));

export function writePurposeScript(directory: string, cwd: string, purpose: SessionPurposeKind, steps: ScriptStep[]) {
  return writeFile(scriptFileFor(directory, cwd, purpose), JSON.stringify(steps));
}

export async function restartedWorker(world: WorkerWorld, runtime = new ScriptedSessionRuntime()) {
  return { runtime, worker: world.build({ runtimes: { claude: runtime }, workerId: "worker-2" }) };
}

export const sendMessage = (world: WorkerWorld, sessionId: string, content: string) => world.harness.caller.session.send({ ...scopeOf(world, sessionId), content, requestKey: crypto.randomUUID() });
