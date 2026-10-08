import { ArrowUpRightIcon } from "@/components/icons";
import { formatMoment } from "@/lib/tasks/formatMoment";
import type { WorkView } from "../contract";
import { ORIGIN_LABEL } from "../workCopy";
import { safeIssueUrl, shortHash } from "../workModel";

export function SourceSummary({ source }: { source: WorkView["source"] }) {
  const url = safeIssueUrl(source.issueUrl);
  return (
    <section aria-label="Fonte analisada" className="space-y-1 text-sm text-ink-2">
      <p>{ORIGIN_LABEL[source.origin]} · revisão {source.revision} · atualizada no GitHub em <time dateTime={source.githubUpdatedAt} suppressHydrationWarning>{formatMoment(source.githubUpdatedAt)}</time></p>
      <p className="font-mono text-xs text-ink-3">Hash {shortHash(source.contentHash)}</p>
      {url && <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline">Abrir #{source.issueNumber} no GitHub<ArrowUpRightIcon size={13} aria-hidden="true" /></a>}
    </section>
  );
}
