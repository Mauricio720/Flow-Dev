import type { RouteSwitchDecision, RouteSwitchDiscardReason, RouteSwitchView } from "../../terminal/routeSwitch";
import type { ProposalContext, RouteSwitchDao, RouteSwitchRecord } from "../../database/dao/routeSwitchDao";
import { evaluateProposal } from "../tasks/routeSwitchRules";
import { TaskError } from "../tasks/taskErrors";
import type { SessionMessageDao } from "../../terminal/sessionInteractionPorts";
import { ROUTE_SWITCH_CONFIRMED_MESSAGE, ROUTE_SWITCH_DECLINED_MESSAGE, routeSwitchDiscardMessage } from "./terminalPromptCopy";
import { routeSwitchDiscardKey } from "./routeSwitchDiscardKey";
import type { SessionLog } from "./sessionLog";
import { toDecidedRouteSwitchView } from "./routeSwitchView";

export type ProposeOutcome = { kind: "proposed"; proposalId: string } | { kind: "ignored" } | { kind: "discarded"; reason: RouteSwitchDiscardReason };
export type ProposeInput = { sessionId: string; assistantMessageId: string; block: { valid: true; summary: string; reasons: string[] } | { valid: false } };
export type DecideResult = { proposal: RouteSwitchView; outcome: "decided" | "replayed" };
export type RouteSwitchProposalDeps = { routeSwitches: RouteSwitchDao; messages: Pick<SessionMessageDao, "insertUserMessage">; log: SessionLog; now: () => Date };

export class RouteSwitchService {
  constructor(private readonly deps: RouteSwitchProposalDeps) {}

  async propose(input: ProposeInput): Promise<ProposeOutcome> {
    const context = await this.deps.routeSwitches.readProposalContext(input.sessionId);
    if (!context?.currentDecisionId) return { kind: "ignored" };
    const verdict = evaluateProposal({ purpose: context.session.purpose, sessionRoute: context.session.route, sessionStatus: context.session.status, hasConfirmedSwitch: context.hasConfirmedSwitch, hasCapturedSpec: context.hasCapturedSpec, hasPendingProposal: context.hasPendingProposal, lastDeclinedAt: context.lastDeclinedAt, lastAnsweredAt: context.lastAnsweredAt });
    if (verdict.kind === "ignore") return { kind: "ignored" };
    if (!input.block.valid) return this.discard(input, "malformed");
    if (verdict.kind === "discard") return this.discard(input, verdict.reason);
    return this.insertProposal({ input, context, block: input.block });
  }

  async decide(input: { record: RouteSwitchRecord; decision: RouteSwitchDecision; actorId: string; requestKey: string }): Promise<DecideResult> {
    const result = await this.deps.routeSwitches.decide({ proposalId: input.record.id, sessionId: input.record.sessionId, decision: input.decision, actorId: input.actorId, requestKey: input.requestKey, decidedAt: this.deps.now(), message: input.decision === "confirm" ? ROUTE_SWITCH_CONFIRMED_MESSAGE : ROUTE_SWITCH_DECLINED_MESSAGE });
    if (result.outcome === "already_decided") throw new TaskError("route_switch_decided");
    if (result.outcome === "not_found" || !result.record) throw new TaskError("route_switch_not_found");
    return { proposal: toDecidedRouteSwitchView(result.record), outcome: result.outcome };
  }

  private async discard(input: ProposeInput, reason: RouteSwitchDiscardReason): Promise<ProposeOutcome> {
    await this.deps.messages.insertUserMessage({ sessionId: input.sessionId, content: routeSwitchDiscardMessage(reason), requestKey: routeSwitchDiscardKey(input.assistantMessageId) });
    this.deps.log.info("route_switch_discarded", { sessionId: input.sessionId, reason });
    return { kind: "discarded", reason };
  }

  private async insertProposal({ input, context, block }: { input: ProposeInput; context: ProposalContext; block: Extract<ProposeInput["block"], { valid: true }> }): Promise<ProposeOutcome> {
    if (!context.currentDecisionId) return { kind: "ignored" };
    const result = await this.deps.routeSwitches.insertPending({ taskId: context.session.taskId, planningDecisionId: context.currentDecisionId, sessionId: input.sessionId, fromRoute: context.session.route as "prd" | "tech_spec", summary: block.summary, reasons: block.reasons, proposedAt: this.deps.now() });
    if (!result.created) return { kind: "ignored" };
    this.deps.log.info("route_switch_proposed", { sessionId: input.sessionId, taskId: context.session.taskId, proposalId: result.record.id });
    return { kind: "proposed", proposalId: result.record.id };
  }
}
