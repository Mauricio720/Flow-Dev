import { Workspace } from "./components/Workspace";

export function IssueComposer({ projectId, projectName }: { projectId?: string; projectName?: string }) {
  return <Workspace key={projectId ?? "none"} projectId={projectId} projectName={projectName} />;
}
