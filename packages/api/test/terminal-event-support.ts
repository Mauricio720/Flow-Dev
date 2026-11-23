import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { hashSessionToken } from "../src/application/services/terminal/sessionToken";
import { projectLocalCheckouts, taskPlanningDecisions, taskTerminalEvents, taskTerminalSessions } from "../src/infra/database/schema";
import { createTerminalEventController } from "../src/infra/terminalEventComposition";
import { sessionFolder } from "./terminal-support";
import { readySetup } from "./terminal-open-support";

type World = Awaited<ReturnType<typeof readySetup>>;

const TOKEN_BYTES = 32;

async function legacyTerminalSession(world: World) {
  const token = randomBytes(TOKEN_BYTES).toString("base64url");
  const [decision] = await world.setup.database.select().from(taskPlanningDecisions);
  const [link] = await world.setup.database.select().from(projectLocalCheckouts).where(eq(projectLocalCheckouts.userId, world.setup.ownerId));
  const values = { taskId: world.setup.taskId, projectId: world.setup.project.id, userId: world.setup.ownerId, planningDecisionId: decision!.id, route: "tech_spec", requestKey: crypto.randomUUID(), checkoutPath: link!.path, dirty: false, tokenHash: hashSessionToken(token), runtime: "terminal" };
  const [row] = await world.setup.database.insert(taskTerminalSessions).values(values as never).returning();
  const settingsPath = join(sessionFolder(world.harness.state, row!.id), "privado", "settings.json");
  await mkdir(join(settingsPath, ".."), { recursive: true });
  await writeFile(settingsPath, "{}");
  return { sessionId: row!.id, token, settingsPath };
}

async function sessionHandle(world: World) {
  const { sessionId, token, settingsPath } = await legacyTerminalSession(world);
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
  return sessionHandle(world);
}

export async function openedSession() {
  const world = await readySetup();
  return { ...world, ...(await openAnotherSession(world)) };
}

export const hook = (name: string, fields: Record<string, unknown> = {}) => ({ hook_event_name: name, session_id: "claude-session-1", ...fields });
export const editOf = (clone: string, relative: string) => hook("PostToolUse", { tool_name: "Write", tool_input: { file_path: join(clone, relative) } });
export const skillOf = (name: string) => hook("PostToolUse", { tool_name: "Skill", tool_input: { skill: `flow-dev:${name}` } });
