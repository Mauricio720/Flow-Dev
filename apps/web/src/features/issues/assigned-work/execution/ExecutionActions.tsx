import { Button } from "@/components/ui/button";
import type { PlanningDecision } from "../contract";
import { READER_NOTE } from "../planningCopy";
import type { TaskExecutionStatus } from "./useTaskExecution";
import { EXECUTION_CANCEL_CONFIRM, EXECUTION_START_CONFIRM } from "./executionCopy";

const ACTIVE_STATES = ["dispatching", "spec_in_progress", "spec_review", "in_progress", "needs_attention"];
const RETRYABLE_STATES = ["failed", "canceled", "rejected"];
const ADMIN_NOTE = "Apenas a pessoa operadora pode iniciar. Administradores podem cancelar execuções ativas.";

type Props = {
  status: TaskExecutionStatus | null;
  decision: PlanningDecision | null;
  canOperate: boolean;
  isAdmin: boolean;
  pending: "start" | "cancel" | null;
  error: string | null;
  onStart: (decisionId: string, version: number, reuseKey: boolean) => void;
  onCancel: (executionId: string) => void;
};

function startExecution(props: Props, reuseKey: boolean) {
  if (!props.decision || !window.confirm(EXECUTION_START_CONFIRM)) return;
  void props.onStart(props.decision.id, props.decision.version, reuseKey);
}

function cancelExecution(props: Props, executionId: string) {
  if (!window.confirm(EXECUTION_CANCEL_CONFIRM)) return;
  void props.onCancel(executionId);
}

function StartButton({ props, label, reuseKey = false }: { props: Props; label: string; reuseKey?: boolean }) {
  return <Button type="button" size="sm" disabled={props.pending !== null} onClick={() => startExecution(props, reuseKey)}>{label}</Button>;
}

export function ExecutionActions(props: Props) {
  const current = props.status?.current ?? null;
  const canRetry = current !== null && RETRYABLE_STATES.includes(current.state) && Boolean(props.status?.canStart) && props.decision !== null;
  const canStart = !current && Boolean(props.status?.canStart) && props.decision !== null;
  const canCancel = current !== null && ACTIVE_STATES.includes(current.state);
  const canStartOrRetry = props.canOperate && (canStart || canRetry || current?.state === "unavailable");
  const canCancelAsAdmin = canCancel && (props.canOperate || props.isAdmin);
  return (
    <div className="space-y-3">
      {props.error && <p role="alert" className="text-sm text-destructive">{props.error}</p>}
      {(canStartOrRetry || canCancelAsAdmin) && <div className="flex flex-wrap gap-2">
        {props.canOperate && canStart && <StartButton props={props} label="Executar no CompozyOS" />}
        {props.canOperate && canRetry && <StartButton props={props} label="Executar novamente" />}
        {props.canOperate && current?.state === "unavailable" && <StartButton props={props} label="Tentar novamente" reuseKey />}
        {canCancelAsAdmin && current && <Button type="button" variant="destructive" size="sm" disabled={props.pending !== null} onClick={() => cancelExecution(props, current.executionId)}>Cancelar execução</Button>}
      </div>}
      {!props.canOperate && <p className="text-sm text-ink-3">{props.isAdmin ? ADMIN_NOTE : READER_NOTE}</p>}
    </div>
  );
}
