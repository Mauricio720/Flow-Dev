export type PlanningWorkspaceProvisionInput = {
  taskId: string;
  projectId: string;
  requesterUserId: string;
  sessionId: string;
  repositoryId: string;
  repositoryNodeId: string;
};

export interface PlanningWorkspaceProvisioner {
  provision(input: PlanningWorkspaceProvisionInput): Promise<void>;
}
