import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { TaskSetData } from "../taskSetContract";
import { OVERVIEW_LABEL, TASK_SET_HEADING, taskSetSummaryText } from "../taskSetCopy";
import { taskSetSummary } from "../taskSetModel";

type Props = { set: TaskSetData; onOverview: () => void; regenerate: ReactNode };

export function TaskSetHeader({ set, onOverview, regenerate }: Props) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0 space-y-1">
        <h2 className="text-[15px] font-semibold text-ink">{TASK_SET_HEADING}</h2>
        <p className="font-mono text-xs text-ink-3 [overflow-wrap:anywhere]">{set.folder}</p>
        <p className="text-sm text-ink-2 tabular-nums">{taskSetSummaryText(taskSetSummary(set.tasks))}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="secondary" onClick={onOverview}>{OVERVIEW_LABEL}</Button>
        {regenerate}
      </div>
    </header>
  );
}
