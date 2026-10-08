export type LegacyStageName = "prd" | "tech_spec" | "tasks";
export type LegacyRoute = "prd" | "tech_spec";

export type LegacyStageRecord = {
  stage: LegacyStageName;
  state: string;
  currentPackageId: string | null;
  approvedPackageId: string | null;
  approvedAt: Date | null;
};

export type LegacyWorkflowRecord = {
  workflowId: string;
  route: LegacyRoute;
  currentStage: LegacyStageName;
  state: string;
  version: number;
  stages: LegacyStageRecord[];
};

export interface LegacyFlowReader {
  readWorkflow(taskId: string): Promise<LegacyWorkflowRecord | null>;
}
