import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { taskTerminalEvents, taskTerminalSessions } from "../src/infra/database/schema";
import { createTerminalEventController } from "../src/infra/terminalEventComposition";
import { openInput } from "./terminal-support";
import { readySetup } from "./terminal-open-support";

type World = Awaited<ReturnType<typeof readySetup>>;

async function sessionHandle(world: World, sessionId: string) {
  const settingsPath = join(world.harness.state, "flow-dev", "terminal-sessions", sessionId, "privado", "settings.json");
  const settings = JSON.parse(await readFile(settingsPath, "utf8"));
  const token: string = settings.hooks.Stop[0].hooks[0].headers.Authorization.replace("Bearer ", "");
  const controller = createTerminalEventController(world.setup.database, { env: world.harness.env });
  const send = async (payload: unknown, bearer = token) => {
    const session = await controller.authenticate(bearer);
    return session ? controller.ingest(session.sessionId, payload) : null;
  };
  const session = async () => (await world.setup.database.select().from(taskTerminalSessions).where(eq(taskTerminalSessions.id, sessionId)))[0]!;
  const events = () => world.setup.database.select().from(taskTerminalEvents).where(eq(taskTerminalEvents.sessionId, sessionId)).orderBy(taskTerminalEvents.occurredAt);
  return { sessionId, token, settingsPath, controller, send, session, events };
}

export async function openAnotherSession(world: World) {
  const { sessionId } = await world.harness.caller.terminal.open(openInput(world.setup));
  return sessionHandle(world, sessionId);
}

export async function openedSession() {
  const world = await readySetup();
  return { ...world, ...(await openAnotherSession(world)) };
}

export const hook = (name: string, fields: Record<string, unknown> = {}) => ({ hook_event_name: name, session_id: "claude-session-1", ...fields });
export const editOf = (clone: string, relative: string) => hook("PostToolUse", { tool_name: "Write", tool_input: { file_path: join(clone, relative) } });
export const skillOf = (name: string) => hook("PostToolUse", { tool_name: "Skill", tool_input: { skill: `flow-dev:${name}` } });
