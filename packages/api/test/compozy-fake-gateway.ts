import type { CompozyGateway, CompozyReviewInput, CompozyRunInput, CompozySessionInput, CompozyTaskSpec, CompozyTaskState } from "../src/application/compozy/compozyGateway";
import { CompozyCallError } from "../src/application/compozy/compozyErrors";
import type { TaskErrorReason } from "../src/application/services/tasks/taskErrors";

const FAKE_VERSION = "0.7.3";
export type FakeCall = { operation: string; input: unknown };

export class FakeCompozyGateway implements CompozyGateway {
  unavailable = false;
  readonly resolvedPaths: string[] = [];
  readonly calls: FakeCall[] = [];
  readonly tasks = new Map<string, CompozyTaskState & { spec: CompozyTaskSpec }>();
  readonly results = new Map<string, string>();
  readonly sessionPullRequests = new Map<string, string>();
  readonly failures = new Map<string, TaskErrorReason>();
  beforeResolve: () => Promise<void> = async () => {};

  async health() { return this.unavailable ? { reachable: false, version: null } : { reachable: true, version: FAKE_VERSION }; }

  async resolveWorkspace(path: string) {
    await this.beforeResolve();
    this.assertAvailable("resolveWorkspace");
    this.resolvedPaths.push(path);
    return { workspaceId: `ws_${this.resolvedPaths.length}` };
  }

  async createTask(workspaceId: string, spec: CompozyTaskSpec) {
    this.record("createTask", { workspaceId, spec });
    const existing = [...this.tasks.values()].find((task) => task.spec.identifier === spec.identifier);
    if (existing) return { taskId: existing.taskId };
    const taskId = `task_${this.tasks.size + 1}`;
    this.tasks.set(taskId, { taskId, spec, status: "ready", latestRun: null, latestReview: null, openBlocks: [] });
    return { taskId };
  }

  async enqueueRun(input: CompozyRunInput) {
    this.record("enqueueRun", input);
    const task = this.task(input.taskId);
    const attempt = (task.latestRun?.attempt ?? 0) + 1;
    task.latestRun = { runId: `${input.taskId}_run_${attempt}`, status: "queued", attempt, sessionId: null, error: null };
    return { runId: task.latestRun.runId };
  }

  async cancelTask(taskId: string) {
    this.record("cancelTask", taskId);
    this.task(taskId).status = "canceled";
  }

  async requestReview(input: CompozyReviewInput) { this.record("requestReview", input); }

  async readTask(taskId: string): Promise<CompozyTaskState> {
    this.record("readTask", taskId);
    const { spec: _spec, ...state } = this.task(taskId);
    return structuredClone(state);
  }

  async readRunResult(runId: string) {
    this.record("readRunResult", runId);
    return this.results.get(runId) ?? "";
  }

  async sessionPullRequest(input: CompozySessionInput) {
    this.record("sessionPullRequest", input);
    const url = this.sessionPullRequests.get(input.sessionId);
    return url ? { url, state: "open" } : null;
  }

  createWorktree(): Promise<{ worktreeId: string; path: string }> { return unsupported("createWorktree"); }
  addDependency(): Promise<void> { return unsupported("addDependency"); }
  approveTask(): Promise<void> { return unsupported("approveTask"); }
  readFile(): ReturnType<CompozyGateway["readFile"]> { return unsupported("readFile"); }

  operations(name: string) {
    return this.calls.filter((call) => call.operation === name);
  }

  task(taskId: string) {
    const task = this.tasks.get(taskId);
    if (!task) throw new CompozyCallError("compozy_task_missing", { operation: "readTask", status: 404 });
    return task;
  }

  private record(operation: string, input: unknown) {
    this.calls.push({ operation, input });
    this.assertAvailable(operation);
    const failure = this.failures.get(operation);
    if (failure) throw new CompozyCallError(failure, { operation });
  }

  private assertAvailable(operation: string) {
    if (this.unavailable) throw new CompozyCallError("compozy_unavailable", { operation });
  }
}

function unsupported(operation: string): Promise<never> {
  return Promise.reject(new Error(`FakeCompozyGateway.${operation} is not scripted`));
}
