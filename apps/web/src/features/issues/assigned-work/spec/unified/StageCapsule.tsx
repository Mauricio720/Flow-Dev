import { PlanningStatusCapsule } from "../../components/PlanningStatusCapsule";
import type { PlanningLifecycle } from "../../planningModel";
import type { FlowStage, StageState } from "./flowStages";
import { READER_STATE_LABELS, STAGE_STATE_LABELS } from "./stageCopy";

const LIFECYCLE: Record<StageState, PlanningLifecycle> = { done: "approved", current: "in_progress", failed: "failed", pending: "awaiting", yours: "review" };
const REVIEW_STAGES = ["spec_review", "tasks_review"];
const REVIEW_LABEL = "Em revisão";

export function StageCapsule({ stage, canAct }: { stage: FlowStage; canAct: boolean }) {
  const labels = canAct ? STAGE_STATE_LABELS : READER_STATE_LABELS;
  const reviewing = stage.state === "yours" && REVIEW_STAGES.includes(stage.key);
  return <PlanningStatusCapsule lifecycle={LIFECYCLE[stage.state]} label={reviewing ? REVIEW_LABEL : labels[stage.state]} />;
}
