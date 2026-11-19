export const bindingStates = ["ready", "invalid"] as const;
export type BindingState = (typeof bindingStates)[number];

export type ProjectCompozyBinding = {
  projectId: string;
  checkoutPath: string;
  compozyWorkspaceId: string | null;
  state: BindingState;
  failureCode: string | null;
  defaultBranch: string | null;
  revision: number;
  checkedAt: Date;
  updatedBy: string | null;
};

export type BindingWrite = Omit<ProjectCompozyBinding, "revision" | "updatedBy"> & { actorId: string };

export interface ProjectCompozyBindingDao {
  find(projectId: string): Promise<ProjectCompozyBinding | null>;
  insert(write: BindingWrite): Promise<ProjectCompozyBinding | null>;
  update(write: BindingWrite, expectedRevision: number): Promise<ProjectCompozyBinding | null>;
}
