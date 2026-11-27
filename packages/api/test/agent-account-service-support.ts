import type { AgentAccountHome } from "../src/application/agent-accounts/agentAccountHome";
import type { LoginInspection } from "../src/application/agent-accounts/agentLoginInspector";
import { AgentAccountService } from "../src/application/services/agent-accounts/agentAccountService";
import { DrizzleAgentAccountDao } from "../src/infra/database/dao/agent-accounts/drizzleAgentAccountDao";
import { taskFixture } from "./task-api-support";

type Inspect = (input: { provider: "claude" | "codex"; home: string }) => Promise<LoginInspection>;
const LOGGED_OUT: LoginInspection = { status: "logged_out", identity: null, plan: null, detail: null };

export async function service(inspect: Inspect = async () => LOGGED_OUT) {
  const setup = await taskFixture();
  const ensured: string[] = [];
  const home: AgentAccountHome = {
    pathOf: ({ id }) => `/state/agent-accounts/${id}`,
    ensure: async ({ id }) => { ensured.push(id); return `/state/agent-accounts/${id}`; },
    logoutAndDelete: async () => ({ logout: "ok" }),
  };
  const inspector = { inspect };
  const logs: string[] = [];
  const dao = new DrizzleAgentAccountDao(setup.database);
  const instance = new AgentAccountService({ accounts: dao, home, inspector, hostId: "host-h", now: () => new Date("2026-11-25T12:00:00.000Z"), log: (message) => logs.push(message) });
  return { setup, instance, ensured, logs, dao };
}
