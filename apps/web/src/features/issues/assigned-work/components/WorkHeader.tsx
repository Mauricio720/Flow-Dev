import type { WorkSnapshot } from "../contract";
import { ClaimPanel } from "./ClaimPanel";
import { SourceSummary } from "./SourceSummary";

export function WorkHeader({ snapshot }: { snapshot: WorkSnapshot }) {
  const { view, detail } = snapshot;
  return (
    <header className="space-y-4">
      <div className="space-y-1">
        <p className="font-mono text-xs text-ink-3">#{view.source.issueNumber}</p>
        <h1 className="text-balance text-2xl font-semibold tracking-[-0.02em] [overflow-wrap:anywhere]">{view.source.title || detail.task.title}</h1>
      </div>
      <SourceSummary source={view.source} />
      <ClaimPanel view={view} />
    </header>
  );
}
