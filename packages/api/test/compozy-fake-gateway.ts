import type { CompozyGateway, CompozyTaskSpec } from "../src/application/compozy/compozyGateway";
import { CompozyCallError } from "../src/application/compozy/compozyErrors";

const FAKE_VERSION = "0.7.3";

export class FakeCompozyGateway implements CompozyGateway {
  unavailable = false;
  readonly resolvedPaths: string[] = [];
  beforeResolve: () => Promise<void> = async () => {};

  async health() {
    return this.unavailable ? { reachable: false, version: null } : { reachable: true, version: FAKE_VERSION };
  }

  async resolveWorkspace(path: string) {
    await this.beforeResolve();
    this.assertAvailable("resolveWorkspace");
    this.resolvedPaths.push(path);
    return { workspaceId: `ws_${this.resolvedPaths.length}` };
  }

  createWorktree(): Promise<{ worktreeId: string; path: string }> { return this.unsupported("createWorktree"); }
  createTask(_workspaceId: string, _spec: CompozyTaskSpec): Promise<{ taskId: string }> { return this.unsupported("createTask"); }
  addDependency(): Promise<void> { return this.unsupported("addDependency"); }
  enqueueRun(): Promise<{ runId: string }> { return this.unsupported("enqueueRun"); }
  approveTask(): Promise<void> { return this.unsupported("approveTask"); }
  cancelTask(): Promise<void> { return this.unsupported("cancelTask"); }
  readTask(): ReturnType<CompozyGateway["readTask"]> { return this.unsupported("readTask"); }
  readRunResult(): Promise<string> { return this.unsupported("readRunResult"); }
  readFile(): ReturnType<CompozyGateway["readFile"]> { return this.unsupported("readFile"); }
  sessionPullRequest(): ReturnType<CompozyGateway["sessionPullRequest"]> { return this.unsupported("sessionPullRequest"); }

  private assertAvailable(operation: string) {
    if (this.unavailable) throw new CompozyCallError("compozy_unavailable", { operation });
  }

  private unsupported(operation: string): Promise<never> {
    return Promise.reject(new Error(`FakeCompozyGateway.${operation} is not scripted`));
  }
}
