import type { PermissionEntry } from "../sessionContract";
import { CANCELLED_LABEL, DECISION_LABEL, WAITING_FOR_OPERATOR_LABEL } from "../sessionCopy";

function outcomeOf(entry: PermissionEntry): string {
  if (entry.status === "cancelled") return CANCELLED_LABEL;
  if (entry.status === "pending") return WAITING_FOR_OPERATOR_LABEL;
  const label = DECISION_LABEL[entry.decision as keyof typeof DECISION_LABEL];
  return entry.reason ? `${label}: ${entry.reason}` : (label ?? "");
}

export function PermissionSummary({ entry }: { entry: PermissionEntry }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-ink [overflow-wrap:anywhere]">{entry.display.title}</p>
      <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md border border-line bg-surface p-3 font-mono text-xs text-ink-2 [overflow-wrap:anywhere]">{entry.display.body}</pre>
      <p className="text-xs text-ink-3">{outcomeOf(entry)}</p>
    </div>
  );
}
