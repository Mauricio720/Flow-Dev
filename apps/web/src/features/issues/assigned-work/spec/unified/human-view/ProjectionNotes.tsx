import { CHANGE_KIND_LABELS, CHANGE_TYPE_LABELS, changesSince, NO_CHANGES, WARNINGS_TITLE } from "./humanViewCopy";
import { InlineText, OverviewHeading } from "./OverviewText";
import type { ViewChange } from "./projectionDiff";

export type VersionChanges = { previousVersion: number; changes: ViewChange[] };

export function ChangesNote({ changes }: { changes: VersionChanges }) {
  const title = changesSince(changes.previousVersion);
  return (
    <section aria-label={title} className="space-y-3 border-t border-line pt-6">
      <OverviewHeading title={title} count={changes.changes.length} />
      {changes.changes.length === 0 ? <p className="text-sm text-ink-3">{NO_CHANGES}</p> : (
        <ul className="divide-y divide-line">
          {changes.changes.map((change, index) => <li key={index} className="flex flex-wrap gap-x-2 py-2 text-sm leading-6"><span className="text-ink-3">{CHANGE_KIND_LABELS[change.kind]} {CHANGE_TYPE_LABELS[change.type]}:</span><span className="text-ink"><InlineText text={change.title} /></span></li>)}
        </ul>
      )}
    </section>
  );
}

export function WarningsNote({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) return null;
  return (
    <details className="group border-t border-line pt-4">
      <summary className="cursor-pointer text-sm font-medium text-ink-2 marker:text-ink-3 hover:text-ink">{WARNINGS_TITLE} ({warnings.length})</summary>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-ink-2 marker:text-ink-3">{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
    </details>
  );
}
