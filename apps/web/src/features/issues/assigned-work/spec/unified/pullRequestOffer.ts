import { isReviewStep, LOOP_KIND } from "./loopNames";
import type { DraftAction, FlowAction, FlowPlan } from "./unifiedContract";

export const PULL_REQUEST_KIND = "open_pull_request";
export const LOCAL_REQUIRED_NOTICE = "A Pull Request automática precisa que a Implementação e o Review tenham rodado no Projeto local vinculado. Nesta Issue o código está em outro checkout: publique a branch manualmente.";

const SUCCEEDED_STATE = "succeeded";
const LOCAL_KIND = "local";

export type PullRequestOffer = { notice: string | null };

/** A Review the operator concluded by hand never reached a clean round, so it does not release publication. */
export function reviewPassedCleanly(actions: FlowAction[]) {
  const reviews = actions.filter(isReviewStep);
  return reviews.length > 0 && reviews.every((review) => review.state === SUCCEEDED_STATE && review.concludedAt === null);
}

/** Null while publication is not on offer; a notice when it is released but cannot run from this plan. */
export function pullRequestOffer(plan: FlowPlan | null, draft: DraftAction[]): PullRequestOffer | null {
  if (!plan || !reviewPassedCleanly(plan.actions)) return null;
  if (draft.some((action) => action.kind === PULL_REQUEST_KIND)) return null;
  const loops = plan.actions.filter((action) => action.kind === LOOP_KIND);
  return { notice: loops.every((loop) => loop.workspace.kind === LOCAL_KIND) ? null : LOCAL_REQUIRED_NOTICE };
}
