import type { WorkSnapshot } from "../contract";
import { ClaimPanel } from "./ClaimPanel";
import { SourceSummary } from "./SourceSummary";
import { IssueDeletionAction } from "@/features/issues/issue-deletion";
import { projectWorkPath } from "@/lib/navigation/projectRoutes";

export function WorkHeader({ snapshot, projectId }: { snapshot: WorkSnapshot; projectId: string }) {
  const { view, detail } = snapshot;
  return (
    <header className="space-y-4">
      <div className="space-y-1">
        <p className="font-mono text-xs text-ink-3">#{view.source.issueNumber}</p>
        <h1 className="text-balance text-2xl font-semibold tracking-[-0.02em] [overflow-wrap:anywhere]">{view.source.title || detail.task.title}</h1>
      </div>
      <SourceSummary source={view.source} />
      <ClaimPanel view={view} />
      <IssueDeletionAction target={{ kind: "task", projectId, taskId: detail.task.id }} returnTo={projectWorkPath(projectId)} />
    </header>
  );
}
