import { performance } from "node:perf_hooks";
import { and, eq } from "drizzle-orm";
import type { WorkerWorld } from "./session-worker-support";
import { taskTerminalMessages, taskTerminalRequests } from "../src/infra/database/schema";

export const UI_POLL_INTERVAL_MS = 1_500;
export const LOAD_QUESTION = [{ question: "Qual carga?", header: "Carga", multiSelect: false, options: [{ label: "Sim", description: "" }] }];
export type RuntimeTimes = { text: Map<string, number>; question: Map<string, number> };

export function observeRuntime(world: WorkerWorld, times: RuntimeTimes) {
  const start = world.runtime.start.bind(world.runtime);
  world.runtime.start = (input) => start({ ...input, handlers: {
    ...input.handlers,
    onAssistantText: (text) => { times.text.set(input.sessionId, performance.now()); input.handlers.onAssistantText(text); },
    onPermission: (request) => { if (request.toolName === "AskUserQuestion") times.question.set(input.sessionId, performance.now()); return input.handlers.onPermission(request); },
  } });
}

export async function observeTimeline(world: WorkerWorld, sessionId: string, times: RuntimeTimes) {
  const scope = { projectId: world.setup.project.id, taskId: world.setup.taskId, sessionId };
  let messagePersistedAt: number | null = null;
  let requestPersistedAt: number | null = null;
  let textObservedAt: number | null = null;
  let requestObservedAt: number | null = null;
  let requestId: string | null = null;
  for (let poll = 0; poll < 12; poll += 1) {
    const textFilter = and(eq(taskTerminalMessages.sessionId, sessionId), eq(taskTerminalMessages.role, "assistant"), eq(taskTerminalMessages.content, "resposta da carga"));
    const message = await world.setup.database.select({ id: taskTerminalMessages.id }).from(taskTerminalMessages).where(textFilter);
    if (message.length > 0 && messagePersistedAt === null) messagePersistedAt = performance.now();
    const request = await world.setup.database.select({ id: taskTerminalRequests.id }).from(taskTerminalRequests).where(eq(taskTerminalRequests.sessionId, sessionId));
    if (request.length > 0 && requestPersistedAt === null) requestPersistedAt = performance.now();
    const page = await world.harness.caller.session.timeline(scope);
    const hasText = page.entries.some((entry) => entry.type === "message" && entry.role === "assistant" && entry.content === "resposta da carga");
    const question = page.entries.find((entry) => entry.type === "question" && entry.status === "pending");
    const observedAt = performance.now();
    if (hasText) textObservedAt ??= observedAt;
    if (question) { requestObservedAt ??= observedAt; requestId = question.id; }
    if (textObservedAt !== null && requestObservedAt !== null) return { textEmittedAt: times.text.get(sessionId)!, messagePersistedAt: messagePersistedAt!, textObservedAt, requestEmittedAt: times.question.get(sessionId)!, requestPersistedAt: requestPersistedAt!, requestObservedAt, requestId: requestId! };
    await new Promise((resolve) => setTimeout(resolve, UI_POLL_INTERVAL_MS));
  }
  throw new Error(`Timeline polling did not observe both emitted entries for ${sessionId}: ${JSON.stringify({ text: times.text.has(sessionId), question: times.question.has(sessionId), messagePersistedAt, requestPersistedAt })}`);
}

export const percentile95 = (values: number[]) => [...values].sort((a, b) => a - b)[Math.ceil(values.length * 0.95) - 1]!;
