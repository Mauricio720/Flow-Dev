import { agentChoiceLabel } from "../agentChoiceCopy";
import type { ReviewCycleView } from "../reviewContract";
import { EXECUTOR_FIELD_LABEL, PARTIAL_MARK, REVIEWER_FIELD_LABEL } from "../reviewCopy";
import { reviewHeadline } from "../reviewModel";

type Props = { cycle: ReviewCycleView | null; reader: boolean };

export function ReviewCycleStatus({ cycle, reader }: Props) {
  return (
    <div className="space-y-2">
      <div aria-live="polite" className="flex flex-wrap items-center gap-2">
        <p className="text-base font-semibold text-ink">{reviewHeadline(cycle, reader)}</p>
        {cycle?.partial ? <span className="rounded-md border border-line px-2 py-0.5 text-xs text-ink-2">{PARTIAL_MARK}</span> : null}
      </div>
      {cycle ? (
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink-2">
          <div className="flex gap-1.5"><dt>{REVIEWER_FIELD_LABEL}:</dt><dd>{agentChoiceLabel(cycle.reviewer)}</dd></div>
          <div className="flex gap-1.5"><dt>{EXECUTOR_FIELD_LABEL}:</dt><dd>{agentChoiceLabel(cycle.executor)}</dd></div>
        </dl>
      ) : null}
    </div>
  );
}
