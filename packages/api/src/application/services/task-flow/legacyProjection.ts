import type { LegacyFlowReader, LegacyRoute, LegacyStageName, LegacyStageRecord } from "../../database/dao/legacyFlowDao";

export const LEGACY_STAGE_LABELS: Record<LegacyStageName, string> = { prd: "PRD", tech_spec: "Tech Spec", tasks: "Tasks" };

export type LegacyStageView = {
  stage: LegacyStageName;
  label: string;
  state: string;
  currentPackageId: string | null;
  approvedPackageId: string | null;
  approvedAt: Date | null;
};

export type LegacyFlowView = {
  flow: "legacy";
  workflowId: string;
  route: LegacyRoute;
  currentStage: LegacyStageName;
  state: string;
  version: number;
  stages: LegacyStageView[];
};

const toStageView = (stage: LegacyStageRecord): LegacyStageView => ({ ...stage, label: LEGACY_STAGE_LABELS[stage.stage] });

export class LegacyProjection {
  constructor(private readonly reader: LegacyFlowReader) {}

  async read(taskId: string): Promise<LegacyFlowView | null> {
    const workflow = await this.reader.readWorkflow(taskId);
    if (!workflow) return null;
    return { flow: "legacy", ...workflow, stages: workflow.stages.map(toStageView) };
  }
}
