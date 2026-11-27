import { requestKeyOf } from "../review/reviewRequestKeys";

const PLAN_RUN_REQUEST_PREFIX = "plan-run";

export function planRunOpenRequestKey(input: { runId: string; itemId: string; resumeCount: number }) {
  return requestKeyOf(`${PLAN_RUN_REQUEST_PREFIX}:${input.runId}:${input.itemId}:${input.resumeCount}`);
}
