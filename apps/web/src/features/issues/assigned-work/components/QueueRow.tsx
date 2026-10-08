import { ArrowUpRightIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import type { QueueItem } from "../contract";
import type { ClaimPhase } from "../hooks/useClaim";
import { safeIssueUrl } from "../workModel";
import { ClaimOutcome } from "./ClaimOutcome";

type Props = { projectId: string; item: QueueItem; phase: ClaimPhase; onClaim: (item: QueueItem) => void };

function IssueLink({ item }: { item: QueueItem }) {
  const url = safeIssueUrl(item.url);
  const title = <span className="font-medium [overflow-wrap:anywhere]">{item.title}</span>;
  if (!url) return title;
  return <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:underline">{title}<ArrowUpRightIcon size={13} aria-hidden="true" /></a>;
}

export function QueueRow({ projectId, item, phase, onClaim }: Props) {
  const busy = phase.phase === "claiming" || phase.phase === "settled";
  return (
    <li className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-1">
        <p className="text-sm"><IssueLink item={item} /></p>
        <p className="font-mono text-xs text-ink-3">{item.repository.owner}/{item.repository.name} #{item.number}</p>
        <p className="text-xs text-ink-3">Status no quadro: {item.status}</p>
        <ClaimOutcome projectId={projectId} phase={phase} />
      </div>
      <Button type="button" size="sm" disabled={busy} onClick={() => onClaim(item)} aria-label={`Reivindicar #${item.number} ${item.title}`}>Reivindicar</Button>
    </li>
  );
}
