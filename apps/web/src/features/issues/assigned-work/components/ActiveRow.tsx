import Link from "next/link";
import { projectWorkTaskPath } from "@/lib/navigation/projectRoutes";
import { formatMoment } from "@/lib/tasks/formatMoment";
import type { ActiveItem } from "../contract";
import { reasonMessage } from "../taskCopy";
import { NEEDS_ATTENTION, NO_OPERATOR, STAGE_NONE } from "../workCopy";

type Props = { projectId: string; item: ActiveItem };

function BlockReason({ reason }: { reason: string }) {
  return (
    <p role="status" className="max-w-[60ch] text-sm text-destructive">
      <span className="font-medium">{NEEDS_ATTENTION}: </span>{reasonMessage(reason)}
    </p>
  );
}

export function ActiveRow({ projectId, item }: Props) {
  return (
    <li className="space-y-1 px-5 py-4">
      <Link href={projectWorkTaskPath(projectId, item.taskId)} className="text-sm font-medium [overflow-wrap:anywhere] hover:underline">{item.title}</Link>
      <p className="font-mono text-xs text-ink-3">#{item.issueNumber}</p>
      <p className="text-xs text-ink-2">Operador: {item.operatorName ?? NO_OPERATOR} · {item.stage ?? STAGE_NONE} · reivindicada em <time dateTime={item.claimedAt} suppressHydrationWarning>{formatMoment(item.claimedAt)}</time></p>
      {item.blockReason && <BlockReason reason={item.blockReason} />}
    </li>
  );
}
