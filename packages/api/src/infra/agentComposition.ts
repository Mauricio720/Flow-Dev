import { IssueContextController } from "../controllers/issueContextController";
import { AgentSettingsService } from "../application/services/projects/agentSettingsService";
import { ContextMcpEndpoint } from "./agents/contextMcpEndpoint";
import type { AgentExecutionDeps } from "./agents/agentExecution";
import { ProviderRunner } from "./agents/providerRunner";
import { requireDatabase } from "./database/client";
import { DrizzleAccessDao } from "./database/dao/drizzleAccessDao";
import { DrizzleAgentSettingsDao } from "./database/dao/projects/drizzleAgentSettingsDao";
import { DrizzleProjectDao } from "./database/dao/projects/drizzleProjectDao";
import { DrizzleIssueContextDao } from "./database/dao/tasks/drizzleIssueContextDao";
import { GitHubScopedContextGateway } from "./github/scopedContextGateway";
import { createRepositoryAccessService } from "./repositoryAccessFactory";

type Database = ReturnType<typeof requireDatabase>;

export type AgentRuntime = { runner: ProviderRunner; endpoint: ContextMcpEndpoint; deps: AgentExecutionDeps };

export function createAgentSettingsService(database: Database) {
  return new AgentSettingsService(new DrizzleAgentSettingsDao(database), new DrizzleProjectDao(database), new DrizzleAccessDao(database));
}

export function createAgentRuntime(database: Database): AgentRuntime {
  const contextDao = new DrizzleIssueContextDao(database);
  const controller = new IssueContextController(contextDao, createRepositoryAccessService(database), new GitHubScopedContextGateway());
  const runner = new ProviderRunner();
  const endpoint = new ContextMcpEndpoint(controller);
  return { runner, endpoint, deps: { settings: createAgentSettingsService(database), runner, endpoint, contextDao } };
}
