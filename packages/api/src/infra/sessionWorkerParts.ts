import { randomUUID } from "node:crypto";
import { InflightTracker } from "../application/services/terminal/inflightTracker";
import { PendingRequestRegistry } from "../application/services/terminal/pendingRequestRegistry";
import { RequestCancellation } from "../application/services/terminal/requestCancellation";
import { SessionExitHandling } from "../application/services/terminal/sessionExit";
import { SessionHandleRegistry } from "../application/services/terminal/sessionHandleRegistry";
import { SessionHandlerFactory } from "../application/services/terminal/sessionHandlers";
import { ConsoleSessionLog, type SessionLog } from "../application/services/terminal/sessionLog";
import type { SessionPermissions } from "../application/services/terminal/sessionPermissions";
import { SessionRecorder } from "../application/services/terminal/sessionRecorder";
import { SessionRequestBroker } from "../application/services/terminal/sessionRequestBroker";
import type { ClaudeSessionRuntime } from "../application/terminal/claudeSessionRuntime";
import type { SessionMessageDao } from "../application/terminal/sessionInteractionPorts";
import type { requireDatabase } from "./database/client";
import { DrizzleSessionControlDao } from "./database/dao/terminal/drizzleSessionControlDao";
import { DrizzleSessionHostDao } from "./database/dao/terminal/drizzleSessionHostDao";
import { DrizzleSessionMessageDao } from "./database/dao/terminal/drizzleSessionMessageDao";
import { DrizzleSessionRequestDao } from "./database/dao/terminal/drizzleSessionRequestDao";
import { DrizzleSessionStatusDao } from "./database/dao/terminal/drizzleSessionStatusDao";
import { DrizzleTerminalSessionDao } from "./database/dao/terminal/drizzleTerminalSessionDao";
import { AgentSdkSessionRuntime } from "./terminal/agentSdkSessionRuntime";
import { FileSessionContextBuilder } from "./terminal/fileSessionContextBuilder";
import { machineIdentity } from "./terminal/machineIdentity";
import { PathToolLocator } from "./terminal/pathToolLocator";
import { ScriptedSessionRuntime } from "./terminal/scriptedSessionRuntime";
import { scriptFromEnvironment } from "./terminal/scriptedSessionSteps";
import { createTerminalEventController } from "./terminalEventComposition";

type Database = ReturnType<typeof requireDatabase>;
export type WorkerOverrides = { runtime?: ClaudeSessionRuntime; messages?: SessionMessageDao; permissions?: SessionPermissions; env?: NodeJS.ProcessEnv; now?: () => Date; hostId?: string; workerId?: string; log?: SessionLog };

function selectRuntime(env: NodeJS.ProcessEnv, log: SessionLog): ClaudeSessionRuntime {
  const script = scriptFromEnvironment(env);
  return script ? new ScriptedSessionRuntime({ script }) : new AgentSdkSessionRuntime({ locator: new PathToolLocator(env), env, log });
}

export function buildWorkerParts(database: Database, overrides: WorkerOverrides) {
  const env = overrides.env ?? process.env;
  const log = overrides.log ?? new ConsoleSessionLog();
  const now = overrides.now ?? (() => new Date());
  const identity = { hostId: overrides.hostId ?? machineIdentity(), workerId: overrides.workerId ?? randomUUID() };
  const sessions = new DrizzleTerminalSessionDao(database);
  const requests = new DrizzleSessionRequestDao(database);
  const messages = overrides.messages ?? new DrizzleSessionMessageDao(database);
  const status = new DrizzleSessionStatusDao(database);
  const registry = new SessionHandleRegistry();
  const pending = new PendingRequestRegistry();
  const cancellation = new RequestCancellation({ requests, registry: pending, now });
  const exit = new SessionExitHandling({ sessions, status, messages, cancellation, registry, now, log });
  const tracker = new InflightTracker();
  const broker = new SessionRequestBroker({ requests, status, registry: pending, tracker, log });
  const recorder = new SessionRecorder({ messages, events: createTerminalEventController(database, { env }), log });
  const handlers = new SessionHandlerFactory({ recorder, permissions: overrides.permissions ?? broker, onExit: (session, outcome) => exit.handle(session, outcome), log });
  const hosts = new DrizzleSessionHostDao(database);
  const control = new DrizzleSessionControlDao(database);
  return { env, log, now, identity, sessions, requests, messages, status, registry, pending, cancellation, exit, handlers, hosts, control, tracker, context: new FileSessionContextBuilder(env), runtime: overrides.runtime ?? selectRuntime(env, log) };
}

export type WorkerParts = ReturnType<typeof buildWorkerParts>;
