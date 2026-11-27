import { AgentAccountController } from "../controllers/agentAccountController";
import { AgentAccountService } from "../application/services/agent-accounts/agentAccountService";
import { DrizzleAgentAccountDao } from "./database/dao/agent-accounts/drizzleAgentAccountDao";
import { requireDatabase } from "./database/client";
import { machineIdentity } from "./terminal/machineIdentity";
import { FileAgentAccountHome } from "./agents/fileAgentAccountHome";
import { CliAgentLoginInspector } from "./agents/cliAgentLoginInspector";
import { PathToolLocator } from "./terminal/pathToolLocator";
import { LocalCodexCatalogProbe } from "./terminal/codex/codexCatalogProbe";
import { AppServerCodexCatalogTransport } from "./terminal/codex/codexCatalogTransport";
import type { WorkAuthorization } from "../application/services/assigned-issues/workAuthorization";
import { WorkAccountService } from "../application/services/agent-accounts/workAccountService";
import { DrizzleTaskAgentAccountDao } from "./database/dao/agent-accounts/drizzleTaskAgentAccountDao";
import type { Database } from "./database/client";
import { createWorkAuthorization } from "./assignedIssuesComposition";
import { WorkAccountController } from "../controllers/workAccountController";

export function createProductionAgentAccountService() {
  const env = process.env;
  const tools = new PathToolLocator(env);
  return new AgentAccountService({ accounts: new DrizzleAgentAccountDao(requireDatabase()), home: new FileAgentAccountHome(env), inspector: new CliAgentLoginInspector(tools, env), codexProbe: accountCodexProbe(tools, env), hostId: machineIdentity() });
}

function accountCodexProbe(tools: PathToolLocator, env: NodeJS.ProcessEnv) {
  return new LocalCodexCatalogProbe({ tools, transport: (binary, input) => new AppServerCodexCatalogTransport({ binary, env, codexHome: input?.codexHome }) });
}

export function createProductionAgentAccountController() {
  return new AgentAccountController(createProductionAgentAccountService());
}

export function createWorkAccountService(database: Database, authorization: Pick<WorkAuthorization, "requireOperate">, hostId: string, env: NodeJS.ProcessEnv = process.env) {
  return new WorkAccountService({ choices: new DrizzleTaskAgentAccountDao(database), accounts: new DrizzleAgentAccountDao(database), home: new FileAgentAccountHome(env), authorization, hostId });
}

export function createProductionWorkAccountController() {
  const database = requireDatabase();
  return new WorkAccountController(createWorkAccountService(database, createWorkAuthorization(database), machineIdentity()));
}
