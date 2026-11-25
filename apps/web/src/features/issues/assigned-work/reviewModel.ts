import { agentChoiceLabel } from "./agentChoiceCopy";
import type { ReviewAction, ReviewCycleView, ReviewState } from "./reviewContract";
import { REVIEW_NOT_STARTED } from "./reviewCopy";
import type { StageTabState } from "./stageTabs";

const FINAL_STATES: readonly ReviewState[] = ["approved", "accepted", "stopped"];
const ASKING_STATUS = "asking";
const OPERATOR_STOP_REASON = null;
const TAB_STATE: Record<ReviewState, StageTabState> = { reviewing: "current", executing: "current", caveats: "yours", failed: "failed", approved: "done", accepted: "done", stopped: "pending" };
const ACTIONS: Record<ReviewState, ReviewAction[]> = { reviewing: ["stop"], executing: ["stop"], caveats: ["accept", "fix"], failed: ["retry", "stop"], approved: [], accepted: [], stopped: [] };

export const reviewIsFinal = (state: ReviewState) => FINAL_STATES.includes(state);
export const reviewNeedsAnswer = (cycle: ReviewCycleView) => !reviewIsFinal(cycle.state) && cycle.step.sessionStatus === ASKING_STATUS;
export const reviewActions = (cycle: ReviewCycleView): ReviewAction[] => (cycle.pendingAction ? [] : ACTIONS[cycle.state]);
export const reviewCanStart = (cycle: ReviewCycleView | null) => cycle === null || reviewIsFinal(cycle.state);

export function reviewTabState(cycle: ReviewCycleView | null): StageTabState {
  if (cycle === null) return "pending";
  if (reviewNeedsAnswer(cycle)) return "yours";
  return TAB_STATE[cycle.state];
}

function activeHeadline(cycle: ReviewCycleView, reader: boolean) {
  const prefix = `Rodada ${cycle.round} · `;
  if (reviewNeedsAnswer(cycle)) return `${prefix}${reader ? "Aguardando a pessoa operadora" : "Aguardando sua resposta na conversa"}`;
  if (cycle.state === "reviewing") return `${prefix}Revisando com ${agentChoiceLabel(cycle.reviewer)}`;
  return `${prefix}Executando com ${agentChoiceLabel(cycle.executor)}`;
}

function stoppedHeadline(cycle: ReviewCycleView) {
  if (cycle.stopReason === OPERATOR_STOP_REASON) return `Parada por você na rodada ${cycle.round}`;
  return `Parada na rodada ${cycle.round}: ${cycle.stopReason}`;
}

export function reviewHeadline(cycle: ReviewCycleView | null, reader: boolean): string {
  if (cycle === null) return REVIEW_NOT_STARTED;
  if (cycle.state === "reviewing" || cycle.state === "executing") return activeHeadline(cycle, reader);
  if (cycle.state === "approved") return `Aprovada na rodada ${cycle.round}`;
  if (cycle.state === "accepted") return `Ressalvas aceitas na rodada ${cycle.round}`;
  if (cycle.state === "caveats") return `Aprovada com ressalvas na rodada ${cycle.round}. Aceite as ressalvas ou peça mais uma correção.`;
  if (cycle.state === "failed") return `Parada por falha na rodada ${cycle.round}: ${cycle.failure}`;
  return stoppedHeadline(cycle);
}
