import type { ExecutionResult, ReconcileResult } from "./actionExecutor";
import type { RunActivity } from "../../database/dao/taskFlowDao";

export type RunSettlement = { state: string; terminalCode: string | null; actionState: string; activity?: RunActivity };

const FAILED_SETTLEMENT = (code: string): RunSettlement => ({ state: "failed", terminalCode: code, actionState: "failed" });

export function settlementFor(result: ExecutionResult | ReconcileResult): RunSettlement | null {
  if ("kind" in result) {
    if (result.kind === "blocked") return { state: "blocked", terminalCode: result.code, actionState: "blocked" };
    if (result.kind === "failed") return FAILED_SETTLEMENT(result.code);
    return null;
  }
  if (result.state === "succeeded") return { state: "succeeded", terminalCode: null, actionState: "succeeded" };
  if (result.state === "canceled") return { state: "canceled", terminalCode: result.code, actionState: "canceled" };
  if (result.state === "blocked") return { state: "blocked", terminalCode: result.code, actionState: "blocked" };
  if (result.state === "stalled" || result.state === "exhausted") return { state: result.state, terminalCode: result.code, actionState: "failed" };
  if (result.state === "failed") return FAILED_SETTLEMENT(result.code ?? "runtime_failed");
  return null;
}
