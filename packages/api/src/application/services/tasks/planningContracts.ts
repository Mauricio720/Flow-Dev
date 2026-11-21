export const planningRoutes = ["direct_execution", "tech_spec", "prd"] as const;
export const planningStatuses = ["awaiting", "in_progress", "failed", "review", "approved"] as const;
export const planningComplexities = ["low", "medium", "high"] as const;

export type PlanningRoute = (typeof planningRoutes)[number];
export type PlanningStatus = (typeof planningStatuses)[number];
export type PlanningComplexity = (typeof planningComplexities)[number];
export type PlanningDecisionSource = "AI" | "HUMAN_OVERRIDE";
export type PlanningAssessment = {
  recommendedRoute: PlanningRoute;
  complexity: PlanningComplexity;
  summary: string;
  reasons: string[];
  uncertainties: string[];
};
export type PlanningInput = {
  protocolVersion: 1;
  operationId: string;
  executionId: string;
  taskId: string;
  inputHash: string;
  publication: PlanningPublicationInput;
};
export type PlanningDispatch = PlanningInput & { issueUrl: string; contextCapability: string };
export type PlanningPublicationInput = {
  attemptId: string;
  repositoryId: string;
  repositoryNodeId: string;
  issueId: string;
  issueNumber: number;
  title: string;
  bodyMarkdown: string;
};

export class PlanningDomainError extends Error {
  constructor(readonly reason: "planning_invalid_output" | "publication_required" | "planning_input_limit" | "planning_conflict") {
    super(reason);
    this.name = "PlanningDomainError";
  }
}
