import type { Database } from "./database/client";
import { SessionAccountGate } from "../application/services/terminal/sessionAccountGate";
import { DrizzleAgentAccountDao } from "./database/dao/agent-accounts/drizzleAgentAccountDao";
import { FileAgentAccountHome } from "./agents/fileAgentAccountHome";
import { CliAgentLoginInspector } from "./agents/cliAgentLoginInspector";
import { PathToolLocator } from "./terminal/pathToolLocator";

export type AccountWorkerInput = { database: Database; env: NodeJS.ProcessEnv; hostId: string; gate?: SessionAccountGate };

export function buildAccountWorkerParts({ database, env, hostId, gate }: AccountWorkerInput) {
  const accounts = new DrizzleAgentAccountDao(database);
  const home = new FileAgentAccountHome(env);
  const inspector = new CliAgentLoginInspector(new PathToolLocator(env), env);
  return { accounts, home, gate: gate ?? new SessionAccountGate({ accounts, home, inspector, hostId }) };
}
