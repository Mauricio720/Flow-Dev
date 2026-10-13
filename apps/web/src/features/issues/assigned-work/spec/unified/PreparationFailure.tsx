import type { FlowCommands } from "./flowView";
import { PREPARATION_FAILED_STATES, PREPARATION_FAILURES, PREPARATION_FAILURE_FALLBACK } from "./unifiedCopy";

export type LocalPreparation = FlowCommands["preparations"][string];

export function PreparationFailure({ preparation }: { preparation?: LocalPreparation }) {
  if (!preparation || !PREPARATION_FAILED_STATES.includes(preparation.state)) return null;
  const reason = preparation.reason ?? (preparation.state === "expired" ? "preparation_expired" : "");
  return (
    <p className="text-sm text-destructive" role="alert">
      {PREPARATION_FAILURES[reason] ?? PREPARATION_FAILURE_FALLBACK}
      {preparation.detail ? <span className="mt-1 block whitespace-pre-wrap break-words text-ink-2">{preparation.detail}</span> : null}
    </p>
  );
}
