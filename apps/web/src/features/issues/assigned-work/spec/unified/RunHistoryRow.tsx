import { ChevronDownIcon } from "@/components/icons";
import { ACTIVE_RUN_STATES, FAILED_RUN_STATES } from "./flowStages";
import { RUN_FEEDBACK, TERMINAL_REASON_LABELS } from "./runFeedback";
import { elapsedLabel, runLabel, runMoment } from "./runTime";
import type { FlowRun } from "./unifiedContract";
import { ACTION_LABELS, RUN_STATE_LABELS } from "./unifiedCopy";
import { RunActivity } from "./RunActivity";

const FAILURE_ACTIVITY_KIND = "warning";
const UNKNOWN_REASON = "O runtime informou um motivo adicional.";
const ROW = "grid cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto] items-center sm:grid-cols-[minmax(0,1fr)_auto_auto] gap-x-3 gap-y-0.5 py-2.5 text-sm [&::-webkit-details-marker]:hidden";

function workspaceLabel(run: FlowRun) {
  if (run.workspaceKind === "local") return "Projeto local vinculado";
  return run.worktreeId ? `Worktree ${run.worktreeId}` : "Checkout isolado";
}

function stateInk(state: string) {
  if (FAILED_RUN_STATES.includes(state)) return "text-destructive";
  return ACTIVE_RUN_STATES.includes(state) ? "font-medium text-ink" : "text-ink-2";
}

function bindingLine(binding: FlowRun["bindings"][number]) {
  const role = binding.role !== "main" ? `${binding.role}: ` : "";
  return `${role}${binding.providerId} · ${binding.modelId} · raciocínio ${binding.reasoningEffort ?? "padrão"} · conexão ${binding.connectionLabel ?? binding.connectionId}${binding.connectionAvailable ? "" : " (indisponível hoje)"}`;
}

export function RunHistoryRow({ run }: { run: FlowRun }) {
  const reason = run.terminalCode ? TERMINAL_REASON_LABELS[run.terminalCode] ?? UNKNOWN_REASON : null;
  const failureDetail = FAILED_RUN_STATES.includes(run.state) && run.activity?.kind === FAILURE_ACTIVITY_KIND ? run.activity.preview : null;
  return (
    <li>
      <details className="group">
        <summary className={ROW}>
          <span className="col-span-2 min-w-0 sm:col-span-1"><span className="font-medium text-ink">{runLabel(run, ACTION_LABELS)}</span> <span className="text-ink-3 tabular-nums">{`· tentativa ${run.attemptNumber}`}</span></span>
          <span className={stateInk(run.state)}>{RUN_STATE_LABELS[run.state] ?? "Estado desconhecido"}</span>
          <span className="flex items-center gap-2 text-ink-3"><time dateTime={run.createdAt} className="font-mono text-xs tabular-nums">{runMoment(run.createdAt)}</time><ChevronDownIcon size={14} className="transition-transform group-open:rotate-180" /></span>
          {reason && <span className="col-span-2 text-ink-2 sm:col-span-3">{reason}</span>}
          {failureDetail && <span className="col-span-2 whitespace-pre-wrap break-words text-ink-2 sm:col-span-3">{failureDetail}</span>}
        </summary>
        <div className="space-y-1 pb-3 text-xs leading-5 text-ink-3">
          <p className="text-sm text-ink-2">{RUN_FEEDBACK[run.state] ?? "O estado da execução não está disponível."}</p>
          {!failureDetail && <RunActivity activity={run.activity ?? null} active={false} />}
          {run.bindings.map((binding) => <p key={binding.role}>{bindingLine(binding)}</p>)}
          <p>{run.finishedAt ? `Duração ${elapsedLabel(run, 0)} · ` : ""}{workspaceLabel(run)} · CompozyOS {run.compozyVersion}</p>
        </div>
      </details>
    </li>
  );
}
