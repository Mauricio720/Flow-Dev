import type { ProjectCompozyBinding } from "../../application/database/dao/projectCompozyBindingDao";

export type ProjectCompozyBindingDto = {
  state: ProjectCompozyBinding["state"];
  checkoutPath: string;
  defaultBranch: string | null;
  compozyWorkspaceId: string | null;
  failureCode: string | null;
  checkedAt: string;
  revision: number;
};

export function mapProjectCompozyBinding(binding: ProjectCompozyBinding): ProjectCompozyBindingDto {
  return {
    state: binding.state,
    checkoutPath: binding.checkoutPath,
    defaultBranch: binding.defaultBranch,
    compozyWorkspaceId: binding.compozyWorkspaceId,
    failureCode: binding.failureCode,
    checkedAt: binding.checkedAt.toISOString(),
    revision: binding.revision,
  };
}
