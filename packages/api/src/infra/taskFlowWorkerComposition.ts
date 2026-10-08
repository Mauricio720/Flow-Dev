import { createWorkAuthorization } from "./assignedIssuesComposition";
import { runAuthorization } from "./taskFlowRunAuthorization";
import type { RunRecord } from "../application/database/dao/taskFlowDao";
import { readSnapshotTask } from "./database/dao/assigned-issues/snapshotTask";
import { randomUUID } from "node:crypto";
import { TaskFlowDispatcher } from "../application/services/task-flow/taskFlowDispatcher";
import { COMPOZY_PIN, MANAGED_AGENT_NAME } from "../application/spec/specPins";
import { TaskError } from "../application/services/tasks/taskErrors";
import { requireDatabase } from "./database/client";
import { DrizzleSoftwareDao } from "./database/dao/software/drizzleSoftwareDao";
import { DrizzleTaskSpecDao } from "./database/dao/spec/drizzleTaskSpecDao";
import { DrizzleFlowUnitOfWork } from "./database/dao/tasks/drizzleFlowUnitOfWork";
import { DrizzleTaskFlowDao } from "./database/dao/tasks/drizzleTaskFlowDao";
import { GitHubHttpRepositoryGateway } from "./github/githubRepositoryGateway";
import { createRepositoryAccessService } from "./repositoryAccessFactory";
import { CompozyRuntimeGateway } from "./spec/compozy/compozyRuntimeGateway";
import { LoopRunExecutor } from "./spec/compozy/loopRunExecutor";
import { RoutingExecutor } from "./spec/compozy/routingExecutor";
import { SnapshotRunExecutor } from "./spec/compozy/snapshotRunExecutor";
import { RegisteredWorkspaceResolver } from "./spec/controlWorkspaceResolver";
import { PodmanRunLauncher } from "./spec/podmanRunLauncher";
import { GitRunWorkspaceProvider, type RunWorkspaceProvider } from "./spec/runWorkspaceProvider";
import { WorkspaceArtifactSource } from "./spec/workspaceArtifactSource";
import { ApprovedArtifactInstaller } from "./spec/approvedArtifactInstaller";
import { PackageCapture } from "../application/services/task-flow/packageCapture";
import { createGitRunner } from "./spec/workspace/gitRunner";
import { GitSpecWorkspaceGateway } from "./spec/workspace/gitWorkspaceGateway";
import { createSoftwareRuntime } from "./softwareComposition";
import { DrizzleLocalConnectorDao } from "./database/dao/local-execution/drizzleLocalConnectorDao";
import { LocalArtifactSource } from "./local-execution/localArtifactSource";
import { LocalActionExecutor } from "./local-execution/localActionExecutor";

const GITHUB_REMOTE_BASE = "https://github.com";
const MAX_CHECKOUT_BYTES = 5 * 1024 ** 3;
const FETCH_TIMEOUT_MS = 120_000;
const LEASE_MS = 60_000;
const IMAGE_DIGEST_PATTERN = /@sha256:[0-9a-f]{64}$/;

type Configuration = { workspaceRoot: string; image: string; docsProxyUrl: string };

async function readConfiguration(environment: NodeJS.ProcessEnv): Promise<Configuration> {
  const settings = await new DrizzleSoftwareDao(requireDatabase()).settings.read();
  const workspaceRoot = environment.SPEC_WORKSPACE_ROOT?.trim();
  const image = environment.SPEC_RUNTIME_IMAGE?.trim();
  if (!settings.enabled || !settings.docsProxyUrl || !workspaceRoot || !image || !IMAGE_DIGEST_PATTERN.test(image)) throw new TaskError("runtime_unconfigured");
  return { workspaceRoot, image, docsProxyUrl: settings.docsProxyUrl };
}

function createWorkspaces(root: string) {
  const github = new GitHubHttpRepositoryGateway();
  return new GitSpecWorkspaceGateway({ root, remoteBase: GITHUB_REMOTE_BASE, git: createGitRunner(), maxCheckoutBytes: MAX_CHECKOUT_BYTES, fetchTimeoutMs: FETCH_TIMEOUT_MS, resolveIdentity: (repository, credential) => github.resolvePath(credential.password, repository.owner, repository.name) });
}

function createProvider(input: { configuration: Configuration; flow: DrizzleTaskFlowDao; resolver: RegisteredWorkspaceResolver; gateway: ReturnType<typeof createSoftwareRuntime>["gateway"] }) {
  const runtimeRoot = `${input.configuration.workspaceRoot}/.runtime`;
  return new GitRunWorkspaceProvider({ flow: input.flow, repositories: createRepositoryAccessService(requireDatabase()), workspaces: createWorkspaces(input.configuration.workspaceRoot), resolver: input.resolver, runtimeRoot, gateway: input.gateway });
}

function createExecutor(input: { configuration: Configuration; flow: DrizzleTaskFlowDao; environment: NodeJS.ProcessEnv; provider: RunWorkspaceProvider; gateway: ReturnType<typeof createSoftwareRuntime>["gateway"]; resolver: RegisteredWorkspaceResolver }) {
  const { configuration, flow, environment, provider, gateway, resolver } = input;
  const database = requireDatabase();
  const runtimeRoot = `${configuration.workspaceRoot}/.runtime`;
  const accepted = { version: COMPOZY_PIN.version, openApiSha256: COMPOZY_PIN.openApiSha256, binarySha256: COMPOZY_PIN.binarySha256, bundleSha256: environment.SPEC_BUNDLE_SHA256?.trim() ?? "" };
  const specs = new DrizzleTaskSpecDao(database);
  const installer = new ApprovedArtifactInstaller(flow, provider);
  const skills = new SnapshotRunExecutor({
    gateway: new CompozyRuntimeGateway(),
    launcher: new PodmanRunLauncher({ runtimeRoot, runtimeImage: configuration.image, docsProxyUrl: configuration.docsProxyUrl }, provider),
    runtime: { agentName: environment.SPEC_AGENT_NAME?.trim() || MANAGED_AGENT_NAME, declared: accepted, accepted },
    beforeSubmit: async (request) => installer.install(request.run),
    taskFor: async (request) => {
      const pinned = (request.snapshot as { sourceSnapshotId?: string | null }).sourceSnapshotId;
      const source = pinned ? await readSnapshotTask(database, pinned) : null;
      if (source) return source;
      const context = await flow.taskContext(request.run.taskId);
      const publication = (await specs.snapshot({ projectId: context!.projectId, taskId: request.run.taskId })).eligibility.publication;
      return { title: publication?.title ?? "", bodyMarkdown: publication?.bodyMarkdown ?? "", issueNumber: publication?.issueNumber ?? 0 };
    },
  });
  const loops = new LoopRunExecutor({ gateway, beforeStart: async (request) => installer.install(request.run), workspaceOf: async (request) => resolver.resolve({ taskId: request.run.taskId, projectId: (await flow.taskContext(request.run.taskId))?.projectId ?? "", worktreeId: request.run.worktreeId }) });
  return new LocalActionExecutor({ local: new DrizzleLocalConnectorDao(database), flow, fallback: new RoutingExecutor(skills, loops) });
}

export async function createProductionTaskFlowDispatcher(environment: NodeJS.ProcessEnv = process.env) {
  const database = requireDatabase();
  const configuration = await readConfiguration(environment);
  const flow = new DrizzleTaskFlowDao(database);
  const gateway = createSoftwareRuntime(environment).gateway;
  const repositories = createRepositoryAccessService(database);
  const resolver = new RegisteredWorkspaceResolver({ flow, repositories, gateway, workspaceRoot: configuration.workspaceRoot });
  const provider = createProvider({ configuration, flow, resolver, gateway });
  const executor = createExecutor({ configuration, flow, environment, provider, gateway, resolver });
  const broker = createSoftwareRuntime(environment).broker;
  const unit = new DrizzleFlowUnitOfWork(database);
  const capture = new PackageCapture(unit, new LocalArtifactSource({ local: new DrizzleLocalConnectorDao(database), flow, fallback: new WorkspaceArtifactSource(provider) }));
  const authorization = createWorkAuthorization(database);
  const authorize = (run: RunRecord) => runAuthorization(authorization, database, run);
  return new TaskFlowDispatcher({ unit, broker, executor, owner: `taskflow:${randomUUID()}`, clock: () => new Date(), leaseMs: LEASE_MS, capture, authorize });
}
