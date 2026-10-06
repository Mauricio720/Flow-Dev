import { Badge } from "@/components/ui/badge";
import type { ThreadEntry } from "../threadModel";
import { formatMoment } from "../toolModel";
import { GraphRow, RichText } from "./Graph";
import { ToolRun } from "./ToolRun";

const AGENT_NAME = "Issue Author";

type RowProps = { entry: ThreadEntry; first: boolean; authorLabel: string; trunk: "ink" | "merge" };

function Moment({ at }: { at: string }) {
  return <time dateTime={at} suppressHydrationWarning className="font-mono text-xs text-ink-3 tabular-nums">{formatMoment(at)}</time>;
}

function Byline({ who, at, question = false }: { who: string; at: string; question?: boolean }) {
  return (
    <p className="flex h-[22px] items-center gap-2 text-sm">
      <span className="font-medium">{who}</span>
      {question && <Badge variant="clarify" className="py-px">pergunta</Badge>}
      <Moment at={at} />
    </p>
  );
}

export function ThreadRow({ entry, first, authorLabel, trunk }: RowProps) {
  if (entry.kind === "activity") return <ToolRun calls={entry.calls} />;
  if (entry.kind === "user") {
    return (
      <GraphRow node="user" first={first} trunk={trunk} className="pb-7">
        <Byline who={authorLabel} at={entry.at} />
        <p className="mt-1 max-w-[65ch] text-[15px] leading-relaxed [overflow-wrap:anywhere] whitespace-pre-wrap"><RichText text={entry.text} /></p>
      </GraphRow>
    );
  }
  if (entry.kind === "question") {
    return (
      <GraphRow node="clarify" first={first} trunk={trunk} className="pb-7">
        <Byline who={AGENT_NAME} at={entry.at} question />
        <p className="mt-1 max-w-[65ch] text-[15px] leading-relaxed [overflow-wrap:anywhere] whitespace-pre-wrap"><RichText text={entry.text} /></p>
      </GraphRow>
    );
  }
  return (
    <GraphRow node="agent" first={first} trunk={trunk} className="pb-7">
      <Byline who={AGENT_NAME} at={entry.at} />
      <p className="mt-1 max-w-[65ch] text-[15px] leading-relaxed text-ink-2 [overflow-wrap:anywhere]">Escreveu o draft “{entry.title}”.</p>
    </GraphRow>
  );
}

export function WorkingRow({ label }: { label: string }) {
  return (
    <GraphRow node="agent" running className="pb-7">
      <p className="node-running flex h-[22px] items-center text-sm font-medium">{AGENT_NAME}</p>
      <p className="node-running mt-1 text-[15px] text-ink-3">{label}</p>
    </GraphRow>
  );
}
