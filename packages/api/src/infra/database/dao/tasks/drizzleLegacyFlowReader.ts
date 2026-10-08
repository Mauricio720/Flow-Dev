import { and, eq } from "drizzle-orm";
import type { LegacyFlowReader, LegacyRoute, LegacyStageName, LegacyWorkflowRecord } from "../../../../application/database/dao/legacyFlowDao";
import type { Database } from "../../client";
import { taskSpecApprovals, taskSpecStages, taskSpecWorkflows } from "../../schema";

const STAGE_ORDER: LegacyStageName[] = ["prd", "tech_spec", "tasks"];

export class DrizzleLegacyFlowReader implements LegacyFlowReader {
  constructor(private readonly database: Database) {}

  async readWorkflow(taskId: string): Promise<LegacyWorkflowRecord | null> {
    const [workflow] = await this.database.select().from(taskSpecWorkflows).where(eq(taskSpecWorkflows.taskId, taskId));
    if (!workflow) return null;
    const rows = await this.database.select({ stage: taskSpecStages, approvedAt: taskSpecApprovals.approvedAt }).from(taskSpecStages)
      .leftJoin(taskSpecApprovals, and(eq(taskSpecApprovals.workflowId, taskSpecStages.workflowId), eq(taskSpecApprovals.stage, taskSpecStages.stage)))
      .where(eq(taskSpecStages.workflowId, workflow.id));
    const stages = rows.map(({ stage, approvedAt }) => ({ stage: stage.stage as LegacyStageName, state: stage.state, currentPackageId: stage.currentPackageId, approvedPackageId: stage.approvedPackageId, approvedAt }));
    stages.sort((first, second) => STAGE_ORDER.indexOf(first.stage) - STAGE_ORDER.indexOf(second.stage));
    return { workflowId: workflow.id, route: workflow.selectedRoute as LegacyRoute, currentStage: workflow.currentStage as LegacyStageName, state: workflow.state, version: workflow.version, stages };
  }
}
