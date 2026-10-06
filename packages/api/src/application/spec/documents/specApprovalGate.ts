import type { SpecReason } from "../../services/spec/specContracts";
import type { ReviewDiagnostic } from "./specDocumentTypes";

export type ApprovalGateInput = {
  captureState: string;
  diagnostics: ReviewDiagnostic[];
  openBlockingDecisions: string[];
  pendingInteractions: number;
  undeliveredResponses: number;
  activeAttempt: boolean;
  unresolvedFinalization: boolean;
};
export type ApprovalBlocker = { reason: SpecReason; detail: string };

const REVIEW_READY_STATE = "review_ready";

export function specApprovalGate(input: ApprovalGateInput): ApprovalBlocker[] {
  const blockers: ApprovalBlocker[] = [];
  if (input.pendingInteractions > 0 || input.activeAttempt) blockers.push({ reason: "attempt_active", detail: "Há uma execução ou pergunta pendente" });
  if (input.undeliveredResponses > 0) blockers.push({ reason: "outcome_unknown", detail: "Há resposta salva ainda não entregue" });
  if (input.unresolvedFinalization || input.captureState !== REVIEW_READY_STATE || input.diagnostics.some((item) => item.severity === "blocking")) blockers.push({ reason: "package_incomplete", detail: "O pacote não está completo e verificado" });
  if (input.openBlockingDecisions.length > 0) blockers.push({ reason: "decision_blocked", detail: `Decisões bloqueantes abertas: ${input.openBlockingDecisions.join(", ")}` });
  return blockers;
}
