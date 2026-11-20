import type { Compozy } from "@compozy/client";
import type { CompozyFileInput, CompozyFileListInput, CompozyGateway, CompozyReviewInput, CompozyRunInput, CompozySessionInput, CompozyTaskSpec, CompozyWorktreeInput } from "../../application/compozy/compozyGateway";
import { CompozyCallError } from "../../application/compozy/compozyErrors";
import { CompozyConnection, type CompozyConnectionOptions } from "./compozyConnection";
import { isDaemonNotFound } from "./compozyErrorTranslation";
import { createTaskRequest, executionProfileRequest, reviewRequest } from "./compozyTaskRequests";
import { readResultText, readTaskState } from "./compozyTaskReads";
import { CompozyWorkspaceGateway } from "./compozyWorkspaceGateway";

const IDENTIFIER_SEARCH_LIMIT = 50;
const CANCEL_REASON = "Canceled from Flow Dev";
const DEPENDENCY_KIND = "blocks";

export class CompozyHttpGateway implements CompozyGateway {
  private readonly connection: CompozyConnection;
  private readonly workspaces: CompozyWorkspaceGateway;

  constructor(options: CompozyConnectionOptions = {}) {
    this.connection = new CompozyConnection(options);
    this.workspaces = new CompozyWorkspaceGateway(this.connection);
  }

  async health() {
    try {
      const identity = await this.connection.call({ operation: "health" }, (client) => client.diagnostics.getRuntimeIdentity());
      return { reachable: true, version: identity.daemon.version };
    } catch (error) {
      if (error instanceof CompozyCallError && error.reason === "compozy_unavailable") return { reachable: false, version: null };
      throw error;
    }
  }

  async resolveWorkspace(path: string) {
    return this.workspaces.resolveWorkspace(path);
  }
  async createWorktree(input: CompozyWorktreeInput) {
    return this.workspaces.createWorktree(input);
  }
  findWorktree(input: { workspaceId: string; name: string }) {
    return this.workspaces.findWorktree(input);
  }
  listFileEntries(input: CompozyFileListInput) {
    return this.workspaces.listFileEntries(input);
  }
  async createTask(workspaceId: string, spec: CompozyTaskSpec) {
    const taskId = await this.connection.call({ operation: "createTask" }, async (client) => (await findTaskId(client, workspaceId, spec.identifier)) ?? (await client.tasks.createTask({ body: createTaskRequest(workspaceId, spec) })).task.id);
    const profile = executionProfileRequest(taskId, spec.profile);
    await this.connection.call({ operation: "setTaskExecutionProfile", taskScoped: true }, (client) => client.tasks.setTaskExecutionProfile({ path: { id: taskId }, body: profile }));
    return { taskId };
  }

  async addDependency(input: { taskId: string; dependsOnTaskId: string }) {
    const body = { depends_on_task_id: input.dependsOnTaskId, kind: DEPENDENCY_KIND } as const;
    await this.connection.call({ operation: "addTaskDependency", taskScoped: true }, (client) => client.tasks.addTaskDependency({ path: { id: input.taskId }, body }));
  }

  async enqueueRun(input: CompozyRunInput) {
    const body = { idempotency_key: input.idempotencyKey, ...(input.metadata ? { metadata: input.metadata } : {}) };
    const { run } = await this.connection.call({ operation: "enqueueTaskRun", taskScoped: true }, (client) => client.tasks.enqueueTaskRun({ path: { id: input.taskId }, body }));
    return { runId: run.id };
  }

  async approveTask(input: { taskId: string; idempotencyKey: string }) {
    await this.connection.call({ operation: "approveTask", taskScoped: true }, (client) => client.tasks.approveTask({ path: { id: input.taskId }, body: { idempotency_key: input.idempotencyKey } }));
  }

  async cancelTask(taskId: string) {
    await this.connection.call({ operation: "cancelTask", taskScoped: true }, (client) => client.tasks.cancelTask({ path: { id: taskId }, body: { reason: CANCEL_REASON } }));
  }

  async requestReview(input: CompozyReviewInput) {
    await this.connection.call({ operation: "requestTaskRunReview", taskScoped: true }, (client) => client.tasks.requestTaskRunReview({ path: { id: input.runId }, body: reviewRequest(input) }));
  }

  readTask(taskId: string) {
    return this.connection.call({ operation: "readTask", taskScoped: true }, (client) => readTaskState(client, taskId));
  }

  readRunResult(runId: string) {
    return this.connection.call({ operation: "readTaskRunResult" }, (client) => readResultText(client, runId));
  }
  async readFile(input: CompozyFileInput) {
    return this.workspaces.readFile(input);
  }

  async sessionPullRequest(input: CompozySessionInput) {
    const path = { workspace_id: input.workspaceId, session_id: input.sessionId };
    const session = await this.connection.call({ operation: "getSession" }, (client) => client.sessions.getSession({ path }).catch((error: unknown) => { if (isDaemonNotFound(error)) return null; throw error; }));
    const pullRequest = session?.session.pull_request;
    return pullRequest ? { url: pullRequest.url, state: pullRequest.state } : null;
  }
}

async function findTaskId(client: Compozy, workspaceId: string, identifier: string) {
  const { tasks } = await client.tasks.listTasks({ query: { workspace: workspaceId, query: identifier, include_drafts: true, limit: IDENTIFIER_SEARCH_LIMIT } });
  return tasks.find((task) => task.identifier === identifier)?.id ?? null;
}
