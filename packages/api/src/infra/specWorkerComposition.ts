import { randomUUID } from "node:crypto";
import { SpecWorkerController } from "../controllers/specWorkerController";
import type { SpecWorkerDeps } from "../controllers/specWorkerTypes";
import { requireDatabase } from "./database/client";
import { DrizzleTaskSpecWorkerDao } from "./database/dao/spec/drizzleTaskSpecWorkerDao";
import { GitHubHttpRepositoryGateway } from "./github/githubRepositoryGateway";
import { createRepositoryAccessService } from "./repositoryAccessFactory";
import { CompozyRuntimeGateway } from "./spec/compozy/compozyRuntimeGateway";
import { GitHubSpecAccessProbe } from "./spec/githubSpecAccessProbe";
import { PodmanRuntimeLauncher } from "./spec/podmanLauncher";
import type { SpecConfiguration } from "./spec/specConfiguration";
import { buildAgentSnapshot } from "./spec/workspace/agentSnapshot";
import { createGitRunner } from "./spec/workspace/gitRunner";
import { GitSpecWorkspaceGateway } from "./spec/workspace/gitWorkspaceGateway";
import { SpecFinalizationService } from "../application/services/spec/specFinalizationService";
import { DrizzleTaskSpecApprovalDao } from "./database/dao/spec/drizzleTaskSpecApprovalDao";
import { DrizzleTaskSpecFinalizationDao } from "./database/dao/spec/drizzleTaskSpecFinalizationDao";
import { SpecCaptureService } from "../application/services/spec/specCaptureService";
import { DrizzleTaskSpecCaptureDao } from "./database/dao/spec/drizzleTaskSpecCaptureDao";
import { COMPOZY_PIN } from "../application/spec/specPins";
import { SPEC_RUNNER_CONCURRENT_ATTEMPTS } from "../application/services/spec/specLimits";

const GITHUB_REMOTE_BASE = "https://github.com";
const MAX_CHECKOUT_BYTES = 5 * 1024 ** 3;
const FETCH_TIMEOUT_MS = 120_000;

export function createProductionSpecWorkerController(configuration: SpecConfiguration) {
  const database = requireDatabase();
  const git = createGitRunner();
  const github = new GitHubHttpRepositoryGateway();
  const accepted = { version: COMPOZY_PIN.version, openApiSha256: COMPOZY_PIN.openApiSha256, binarySha256: COMPOZY_PIN.binarySha256, bundleSha256: configuration.declaredPins.bundleSha256 };
  const dao = new DrizzleTaskSpecWorkerDao(database);
  const workspaces = new GitSpecWorkspaceGateway({ root: configuration.workspaceRoot, remoteBase: GITHUB_REMOTE_BASE, git, maxCheckoutBytes: MAX_CHECKOUT_BYTES, fetchTimeoutMs: FETCH_TIMEOUT_MS, resolveIdentity: (repository, credential) => github.resolvePath(credential.password, repository.owner, repository.name) });
  const deps: SpecWorkerDeps = {
    dao,
    runtime: new CompozyRuntimeGateway(),
    workspaces,
    finalization: new SpecFinalizationService(new DrizzleTaskSpecFinalizationDao(database), workspaces),
    launcher: new PodmanRuntimeLauncher(configuration),
    access: new GitHubSpecAccessProbe(createRepositoryAccessService(database)),
    upstream: async (claim) => (await dao.approvedUpstream(claim)).flatMap((item) => item.entries),
    approvals: new DrizzleTaskSpecApprovalDao(database),
    capture: new SpecCaptureService(new DrizzleTaskSpecCaptureDao(database)),
    snapshot: async (_claim, checkoutPath, target) => { await buildAgentSnapshot({ git, checkoutPath, target }); },
    settings: { runnerId: configuration.runnerId, maxActive: SPEC_RUNNER_CONCURRENT_ATTEMPTS, agentName: configuration.agentName, provider: configuration.provider, model: configuration.model, runtime: { agentName: configuration.agentName, provider: configuration.provider, model: configuration.model, declared: configuration.declaredPins, accepted }, workspaceRoot: configuration.workspaceRoot },
    owner: `${configuration.runnerId}:${randomUUID()}`,
    clock: () => new Date(),
  };
  return new SpecWorkerController(deps);
}
