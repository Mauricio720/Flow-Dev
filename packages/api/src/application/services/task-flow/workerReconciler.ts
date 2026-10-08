import type { LoopRunStatus } from "../../software/compozyControlGateway";
import type { ReconcileResult } from "./actionExecutor";

const SUCCEEDED_STATES = ["done", "no-op"];
const RUNNING_STATES = ["queued", "running", "watching", "needs-approval", "paused"];
const TERMINAL_STATES = ["blocked", "failed", "exhausted", "stalled", "canceled"] as const;

export class WorkerReconciler {
  resolve(status: LoopRunStatus | null): ReconcileResult {
    if (!status) return { state: "unknown", code: null };
    const activity = status.activity ? { activity: status.activity } : {};
    if (SUCCEEDED_STATES.includes(status.state)) return { state: "succeeded", code: status.state === "no-op" ? "no_op" : null, ...activity };
    if (RUNNING_STATES.includes(status.state)) return { state: "running", code: status.state === "needs-approval" ? "needs_approval" : null, ...activity };
    const terminal = TERMINAL_STATES.find((state) => state === status.state);
    if (!terminal) return { state: "unknown", code: null };
    return { state: terminal, code: status.terminalReason ?? status.state, ...activity };
  }
}
