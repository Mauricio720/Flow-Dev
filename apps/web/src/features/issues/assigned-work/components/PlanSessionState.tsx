import type { PlanItemView } from "../planContract";
import { CONVERSATION_LABEL } from "../planCopy";
import { forcedNote, planStateText } from "../planStateModel";
import type { TaskItem } from "../taskSetContract";

type Props = { item: PlanItemView; tasks: TaskItem[]; onConversation?: (sessionId: string) => void };

export function PlanSessionState({ item, tasks, onConversation }: Props) {
  const note = forcedNote(item.forced);
  const sessionId = item.latestSessionId;
  return (
    <div className="min-w-0 space-y-0.5 text-sm">
      <p role={item.state === "blocked" ? "status" : undefined} className="font-medium text-ink">{planStateText(item, tasks)}</p>
      {note ? <p className="text-xs text-ink-2">{note}</p> : null}
      {sessionId && onConversation ? <button type="button" onClick={() => onConversation(sessionId)} className="text-xs text-ink-2 underline underline-offset-2 hover:text-ink">{CONVERSATION_LABEL}</button> : null}
    </div>
  );
}
