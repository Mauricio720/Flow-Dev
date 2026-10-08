import type { FlowStage } from "./flowStages";
import type { FlowTarget } from "./unifiedContract";
import type { useFlowCommands } from "./useFlowCommands";
import type { useFlowData } from "./useFlowData";
import type { usePlanDraft } from "./usePlanDraft";

export type FlowCommands = ReturnType<typeof useFlowCommands>;
export type PlanDraft = ReturnType<typeof usePlanDraft>;
export type FlowView = { target: FlowTarget; canAct: boolean; data: ReturnType<typeof useFlowData>; commands: FlowCommands; draft: PlanDraft; stages: FlowStage[]; turn: FlowStage };
