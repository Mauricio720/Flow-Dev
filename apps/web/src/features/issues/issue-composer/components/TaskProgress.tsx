import { Button } from "@/components/ui/button";
import type { TaskDetail } from "../contract";
import { reasonMessage } from "../taskCopy";
import { GraphRow } from "./Graph";
import { WorkingRow } from "./ThreadRows";

const GENERATING_LABEL = "Consultando o contexto e escrevendo o draft…";
const FAILED_STATUS = "generation_failed";
const GENERATION_REASONS = ["generation_timeout", "provider_unavailable", "provider_usage_limit", "invalid_agent_output", "invalid_agent_activity", "invalid_agent_source", "execution_mismatch", "context_limit", "service_unavailable"];
const PRIOR_WORK_NOTE = "O que já estava confirmado nesta tarefa continua salvo.";

type Props = { detail: TaskDetail; busy: boolean; onRetry: (() => void) | null };

function canRetryGeneration(detail: TaskDetail) {
  return detail.task.status === FAILED_STATUS || GENERATION_REASONS.includes(detail.lastError?.reason ?? "");
}

export function TaskProgress({ detail, busy, onRetry }: Props) {
  if (detail.task.status === "generating") return <li><WorkingRow label={GENERATING_LABEL} /></li>;
  if (!detail.lastError) return null;
  return (
    <li>
      <GraphRow node="agent" className="pb-7">
        <div role="alert" className="space-y-2">
          <p className="text-sm font-medium text-destructive">A última operação não foi concluída</p>
          <p className="max-w-[65ch] text-[15px] leading-relaxed text-ink-2">{reasonMessage(detail.lastError.reason)} {PRIOR_WORK_NOTE}</p>
          {onRetry && canRetryGeneration(detail) && <Button type="button" variant="outline" size="sm" disabled={busy} onClick={onRetry}>Tentar a geração de novo</Button>}
        </div>
      </GraphRow>
    </li>
  );
}
