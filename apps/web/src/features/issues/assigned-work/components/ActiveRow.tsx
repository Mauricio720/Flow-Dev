import Link from "next/link";
import { projectWorkTaskPath } from "@/lib/navigation/projectRoutes";
import { formatMoment } from "@/lib/tasks/formatMoment";
import { cn } from "@/lib/utils";
import type { ActiveItem } from "../contract";
import { ROUTE_CHIP_LABEL } from "../progressCopy";
import { STATE_TONE } from "../progressTone";
import { reasonMessage } from "../taskCopy";
import { NEEDS_ATTENTION, NO_OPERATOR } from "../workCopy";
import { progressSummary, type ProgressSummary } from "../workProgress";
import { LiveRunSummary } from "./LiveRunSummary";
import { ProgressRail } from "./ProgressRail";

type Props = { projectId: string; item: ActiveItem; operator: boolean };

function BlockReason({ reason }: { reason: string }) {
  return (
    <p role="status" className="max-w-[60ch] text-sm text-destructive">
      <span className="font-medium">{NEEDS_ATTENTION}: </span>{reasonMessage(reason)}
    </p>
  );
}

function RowMeta({ item }: { item: ActiveItem }) {
  const route = item.progress.route ? ROUTE_CHIP_LABEL[item.progress.route] : null;
  return (
    <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-ink-2">
      <span className="font-mono text-ink-3">#{item.issueNumber}</span>
      {route && <span className="rounded-full border border-line px-2 py-px text-[11px] text-ink-2">{route}</span>}
      <span>· Operador: {item.operatorName ?? NO_OPERATOR} · reivindicada em <time dateTime={item.claimedAt} suppressHydrationWarning>{formatMoment(item.claimedAt)}</time></span>
    </p>
  );
}

function StateBadge({ summary }: { summary: ProgressSummary }) {
  return <span className={cn("inline-flex h-6 shrink-0 items-center rounded-full border px-2.5 text-xs font-medium", STATE_TONE[summary.state].badge)}>{summary.badge}</span>;
}

export function ActiveRow({ projectId, item, operator }: Props) {
  const summary = progressSummary(item, operator);
  return (
    <li className="relative space-y-3 overflow-hidden rounded-lg border border-line bg-raised px-5 py-4 shadow-raised">
      <span aria-hidden="true" className={cn("absolute inset-y-0 left-0 w-1", STATE_TONE[summary.state].bar)} />
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1 space-y-1">
          <Link href={projectWorkTaskPath(projectId, item.taskId)} className="text-[15px] leading-snug font-medium [overflow-wrap:anywhere] hover:underline">{item.title}</Link>
          <RowMeta item={item} />
        </div>
        <StateBadge summary={summary} />
      </div>
      <ProgressRail rail={summary.rail} />
      <p className={cn("text-sm font-medium", STATE_TONE[summary.state].headline)}>{summary.headline}</p>
      {summary.run && <LiveRunSummary run={summary.run} />}
      {item.blockReason && <BlockReason reason={item.blockReason} />}
    </li>
  );
}
