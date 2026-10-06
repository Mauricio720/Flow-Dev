import type { Project } from "@/lib/projects/contract";
import { Workspace } from "./components/Workspace";
import type { WorkspaceLoad } from "./contract";

type Props = { project: Project; initial: WorkspaceLoad };

export function IssueComposer({ project, initial }: Props) {
  return <Workspace key={project.id} project={project} initial={initial} />;
}
