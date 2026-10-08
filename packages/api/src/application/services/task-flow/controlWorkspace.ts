import type { WorkspaceChoice } from "./flowContracts";

export type ControlWorkspace = { workspaceId: string; repositoryId: string; worktreePath?: string };

export interface ControlWorkspaceResolver {
  resolve(input: { taskId: string; projectId: string; worktreeId?: string | null; workspace?: WorkspaceChoice }): Promise<ControlWorkspace | null>;
}
