import { TERMINAL_REASON_LABELS } from "./runFeedback";
import { runMoment } from "./runTime";
import type { FlowRun } from "./unifiedContract";
import { RUN_STATE_LABELS } from "./unifiedCopy";

const FAILURE_ACTIVITY_KIND = "warning";
const NO_REASON = "O runtime não informou o motivo. O que a execução registrou está no histórico de execuções, no fim desta etapa.";
const REGION_LABEL = "O que aconteceu na última tentativa";

export function LastFailure({ run }: { run: FlowRun }) {
  const reason = run.terminalCode ? TERMINAL_REASON_LABELS[run.terminalCode] ?? null : null;
  const detail = run.activity?.kind === FAILURE_ACTIVITY_KIND ? run.activity.preview : null;
  const endedAt = run.finishedAt ?? run.createdAt;
  return (
    <div role="group" aria-label={REGION_LABEL} className="space-y-1 rounded-lg bg-surface px-3 py-2.5 text-sm">
      <p className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-medium text-ink">Tentativa <span className="tabular-nums">{run.attemptNumber}</span> · <span className="text-destructive">{RUN_STATE_LABELS[run.state] ?? run.state}</span></span>
        <time dateTime={endedAt} className="font-mono text-xs tabular-nums text-ink-3">{runMoment(endedAt)}</time>
      </p>
      {reason && <p className="leading-6 text-ink-2">{reason}</p>}
      {detail && <p className="max-h-40 overflow-auto leading-6 whitespace-pre-wrap break-words text-ink-2">{detail}</p>}
      {!reason && !detail && <p className="leading-6 text-ink-2">{NO_REASON}</p>}
    </div>
  );
}
