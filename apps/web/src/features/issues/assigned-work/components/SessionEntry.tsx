import { formatMoment } from "@/lib/tasks/formatMoment";
import { renderArtifactMarkdown } from "../artifactMarkdown";
import { EVENT_LABEL } from "../executionCopy";
import { MARKDOWN_FRAME } from "../markdownFrame";
import type { MessageEntry, TimelineEntry } from "../sessionContract";
import type { SessionActions } from "../hooks/useSessionActions";
import { assistantLabelFor, QUEUED_LABEL, UNDELIVERED_LABEL, USER_LABEL } from "../sessionCopy";
import { PermissionRequestCard } from "./PermissionRequestCard";
import { QuestionRequestCard } from "./QuestionRequestCard";

type Props = { entry: TimelineEntry; agent: string; canAnswer: boolean; actions: SessionActions };

const SPEAKER = "text-xs font-semibold text-ink-3";

function Moment({ at }: { at: string }) {
  return <time dateTime={at} className="font-mono text-xs tabular-nums text-ink-3" suppressHydrationWarning>{formatMoment(at)}</time>;
}

function MessageLine({ entry, agent }: { entry: MessageEntry; agent: string }) {
  if (entry.role === "system") return <p className="text-sm italic text-ink-3 [overflow-wrap:anywhere]">{entry.content}</p>;
  const mine = entry.role === "user";
  return (
    <div className="space-y-1">
      <p className="flex items-baseline gap-2"><span className={SPEAKER}>{mine ? USER_LABEL : assistantLabelFor(agent)}</span><Moment at={entry.at} />{entry.queued && <span className="text-xs text-clarify-ink">{QUEUED_LABEL}</span>}{entry.undelivered && <span className="text-xs text-destructive">{UNDELIVERED_LABEL}</span>}</p>
      {mine ? <p className="whitespace-pre-wrap text-[15px] text-ink [overflow-wrap:anywhere]">{entry.content}</p> : <div className={MARKDOWN_FRAME} dangerouslySetInnerHTML={{ __html: renderArtifactMarkdown(entry.content) }} />}
    </div>
  );
}

export function SessionEntry({ entry, agent, canAnswer, actions }: Props) {
  if (entry.type === "message") return <MessageLine entry={entry} agent={agent} />;
  if (entry.type === "event") return <p className="flex gap-3 text-sm text-ink-3"><Moment at={entry.at} /><span className="[overflow-wrap:anywhere]">{EVENT_LABEL[entry.kind](entry.summary)}</span></p>;
  if (entry.type === "question") return <QuestionRequestCard entry={entry} agent={agent} canAnswer={canAnswer} busy={actions.busy} onAnswer={actions.answer} />;
  return <PermissionRequestCard entry={entry} agent={agent} canAnswer={canAnswer} busy={actions.busy} onDecide={actions.decide} />;
}
