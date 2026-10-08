import type { ActionExecutor, ExecutionRequest } from "../../../application/services/task-flow/actionExecutor";

const isLoop = (request: ExecutionRequest) => request.snapshot.kind === "loop";

export class RoutingExecutor implements ActionExecutor {
  constructor(private readonly skills: ActionExecutor, private readonly loops: ActionExecutor) {}

  private pick(request: ExecutionRequest) {
    return isLoop(request) ? this.loops : this.skills;
  }

  execute(request: ExecutionRequest) {
    return this.pick(request).execute(request);
  }

  reconcile(request: ExecutionRequest) {
    return this.pick(request).reconcile(request);
  }

  cancel(request: ExecutionRequest) {
    const target = this.pick(request);
    if (!target.cancel) throw new Error("cancel_unsupported");
    return target.cancel(request);
  }
}
