import type { ActionExecutor, ExecutionRequest, ReconcileResult } from "../../application/services/task-flow/actionExecutor";
import type { RunLauncher } from "./compozy/snapshotRunExecutor";

const CANCELED_BY_AUTHOR = "canceled_by_author";

export class RunCanceller implements Pick<ActionExecutor, "cancel"> {
  constructor(private readonly loops: ActionExecutor, private readonly launcher: Pick<RunLauncher, "stop">) {}

  async cancel(request: ExecutionRequest): Promise<ReconcileResult> {
    if (request.snapshot.kind === "loop") return this.loops.cancel!(request);
    await this.launcher.stop(request.run.id);
    return { state: "canceled", code: CANCELED_BY_AUTHOR };
  }
}
