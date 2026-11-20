import type { TaskExecutionStatus } from "./useTaskExecution";
import { executionStatusCopy } from "./executionCopy";

type Props = { history: TaskExecutionStatus["history"] };

function finishedAt(value: string | null) {
  if (!value) return "Horário não disponível";
  return new Date(value).toLocaleString("pt-BR");
}

export function ExecutionHistory({ history }: Props) {
  if (history.length === 0) return null;
  return (
    <details className="rounded-xl border border-line bg-raised px-5 py-4">
      <summary className="cursor-pointer text-sm font-semibold">Execuções anteriores ({history.length})</summary>
      <ol className="mt-3 divide-y divide-line">
        {history.map((item) => <li key={item.executionId} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
          <span>{executionStatusCopy(item.state).label} · tentativa {item.attempt}</span>
          <time className="text-xs text-ink-3">{finishedAt(item.finishedAt)}</time>
        </li>)}
      </ol>
    </details>
  );
}
