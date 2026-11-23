import { taskTerminalEvents, taskTerminalMessages, taskTerminalRequests } from "../src/infra/database/schema";
import { PERMISSION_PAYLOAD, type openedFlowDevSession } from "./session-interaction-support";
import { HARNESS_NOW } from "./terminal-harness";

export type TimelineWorld = Awaited<ReturnType<typeof openedFlowDevSession>>;

const BASE_MS = HARNESS_NOW.getTime() - 60 * 60_000;
export const at = (index: number) => new Date(BASE_MS + index * 1_000);
export const timeline = (world: TimelineWorld, after?: string) => world.harness.caller.session.timeline({ ...world.scope, after });

export async function seedEntries(world: TimelineWorld, count: number) {
  const database = world.setup.database;
  for (let index = 0; index < count; index += 1) {
    const sessionId = world.sessionId;
    if (index % 3 === 0) await database.insert(taskTerminalMessages).values({ sessionId, role: "assistant", content: `mensagem ${index}`, occurredAt: at(index) });
    if (index % 3 === 1) await database.insert(taskTerminalEvents).values({ sessionId, kind: "command", summary: `evento ${index}`, occurredAt: at(index) });
    if (index % 3 === 2) await database.insert(taskTerminalRequests).values({ sessionId, kind: "permission", toolUseId: `toolu_${index}`, payload: PERMISSION_PAYLOAD, createdAt: at(index) });
  }
}
