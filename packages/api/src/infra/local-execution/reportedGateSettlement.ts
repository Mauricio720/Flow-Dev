import { settleGates } from "../../application/services/local-execution/gateSettlement";
import type { ReconcileResult } from "../../application/services/task-flow/actionExecutor";
import type { ActionSnapshot } from "../../application/services/task-flow/flowContracts";

type Preparation = NonNullable<ActionSnapshot["localPreparation"]>;
type ReportedEvent = { kind: string; payload: Record<string, unknown> };
type GateState = "passed" | "failed" | "blocked" | "unrun" | "unknown";
type SettlementInput = { runId: string; actionKind: string; preparation: Preparation; events: ReportedEvent[]; finalCheckoutDigest: string };

const GATE_EVENT = "gate";

function reportedGates(input: SettlementInput) {
  const required = (event: ReportedEvent) => input.preparation.requiredGates.some((gate) => gate.id === event.payload.gateId && gate.commandDigest === event.payload.commandDigest);
  return input.events.filter((event) => event.kind === GATE_EVENT).filter(required).map((event) => ({
    runId: input.runId,
    gateId: String(event.payload.gateId),
    attempt: Number(event.payload.attempt),
    manifestHash: String(event.payload.manifestHash),
    state: String(event.payload.state) as GateState,
    reason: typeof event.payload.reason === "string" ? event.payload.reason : null,
    checkedCheckoutDigest: String(event.payload.checkedCheckoutDigest),
    commandDigest: String(event.payload.commandDigest),
  }));
}

/** Settles a local run from the gate results the connector reported for the gates pinned at preparation. */
export function settleReportedGates(input: SettlementInput): Pick<ReconcileResult, "state" | "code"> {
  const requiredGates = input.preparation.requiredGates.map((gate) => ({ ...gate, label: gate.id, argv: [], cwd: ".", timeoutMs: 1, serviceUrls: [], environmentKeys: [] }));
  const settled = settleGates({
    runId: input.runId,
    manifest: { actionKind: input.actionKind, sources: [], requiredGates, hash: input.preparation.manifestHash },
    results: reportedGates(input),
    runtimeSucceeded: true,
    artifactsSafe: true,
    finalCheckoutDigest: input.finalCheckoutDigest,
  });
  if (settled.state !== "succeeded") return { state: settled.state === "failed" ? "failed" : "blocked", code: settled.reason };
  return { state: "succeeded", code: input.preparation.requiredGates.length === 0 ? "none_required" : null };
}
