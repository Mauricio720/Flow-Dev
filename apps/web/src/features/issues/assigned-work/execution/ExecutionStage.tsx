import type { PlanningDecision } from "../contract";
import { Button } from "@/components/ui/button";
import { ROUTE_CHIP_LABEL } from "../progressCopy";
import { ExecutionActions } from "./ExecutionActions";
import { ExecutionHistory } from "./ExecutionHistory";
import { ExecutionStatus } from "./ExecutionStatus";
import type { TaskExecutionView } from "./useTaskExecution";

type Props = { execution: TaskExecutionView; decision: PlanningDecision | null; canOperate: boolean; isAdmin: boolean };

function routeLabel(execution: TaskExecutionView, decision: PlanningDecision | null) {
  const route = execution.status?.current?.route ?? decision?.selectedRoute;
  return route ? ROUTE_CHIP_LABEL[route] ?? route : null;
}

export function ExecutionStage({ execution, decision, canOperate, isAdmin }: Props) {
  const status = execution.status;
  const route = routeLabel(execution, decision);
  const actionProps = {
    status,
    decision,
    canOperate,
    isAdmin,
    pending: execution.pending,
    error: execution.actionError,
    onStart: execution.start,
    onCancel: execution.cancel,
  };
  return (
    <section aria-label="Execução" className="space-y-4">
      <header className="space-y-1"><h2 className="text-[17px] font-semibold">Execução</h2>{route && <p className="text-sm text-ink-2">Rota: {route}</p>}</header>
      {execution.loading && !status && <p role="status" className="text-sm text-ink-2">Consultando a execução…</p>}
      {execution.error && !status && <div role="alert" className="space-y-2"><p className="text-sm text-destructive">{execution.error}</p><Button type="button" variant="outline" size="sm" onClick={() => void execution.refresh()}>Atualizar estado</Button></div>}
      {status && <ExecutionStatus current={status.current} route={null} canStart={status.canStart} blocker={status.startBlockedBy} />}
      {status && <ExecutionActions {...actionProps} />}
      {status && <ExecutionHistory history={status.history} />}
    </section>
  );
}
