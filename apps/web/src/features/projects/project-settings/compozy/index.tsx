import type { Project } from "@/lib/projects/contract";
import { CompozyBindingEditor } from "./CompozyBindingEditor";
import { CompozyBindingReadOnly } from "./CompozyBindingReadOnly";

const UNKNOWN_REPOSITORY = "o repositório do projeto";

type Props = { project: Project; canEdit: boolean };

export function CompozyExecutionSettings({ project, canEdit }: Props) {
  const repository = project.repository ? `${project.repository.owner}/${project.repository.name}` : UNKNOWN_REPOSITORY;
  return canEdit ? <CompozyBindingEditor projectId={project.id} repository={repository} /> : <CompozyBindingReadOnly projectId={project.id} repository={repository} />;
}
