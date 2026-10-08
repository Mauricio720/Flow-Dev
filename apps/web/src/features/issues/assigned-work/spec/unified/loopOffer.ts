import type { FlowTab } from "./flowTabs";
import { missingLoopsNotice, REVIEW_WAITING_NOTICE } from "./loopCatalogCopy";
import { IMPLEMENT_LOOP, LOOP_KIND, REVIEW_LOOP } from "./loopNames";
import type { FlowLoopOption, FlowOptions, FlowPlan } from "./unifiedContract";

const SUCCEEDED_STATE = "succeeded";

export type LoopOffer = { choices: FlowLoopOption[]; offerable: FlowLoopOption[]; notice: string | null; single: boolean };
type OfferInput = { tab: FlowTab; plan: FlowPlan | null; options: FlowOptions; added: boolean };

function implemented(plan: FlowPlan | null) {
  return plan?.actions.some((action) => action.kind === LOOP_KIND && action.loopName === IMPLEMENT_LOOP && action.state === SUCCEEDED_STATE) ?? false;
}

/** The Loops a stage tab can add now, or the sentence that says why it cannot add any. */
export function loopOffer({ tab, plan, options, added }: OfferInput): LoopOffer | null {
  if (tab.actionKind !== LOOP_KIND) return null;
  const choices = options.loops.filter((loop) => (loop.name === REVIEW_LOOP) === tab.review);
  const waiting = tab.review && !implemented(plan);
  const offerable = waiting ? [] : choices.filter((loop) => loop.offerable);
  const missing = waiting && choices.length > 0 ? REVIEW_WAITING_NOTICE : missingLoopsNotice(choices, options.loopsReason);
  return { choices, offerable, notice: offerable.length > 0 || added ? null : missing, single: tab.review || choices.length === 1 };
}

export function showsLoopAdder(offer: LoopOffer | null, added: boolean) {
  if (!offer) return false;
  return offer.notice !== null || (offer.offerable.length > 0 && !(offer.single && added));
}
