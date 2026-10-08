import { runClock } from "./runTime";
import type { FlowRun } from "./unifiedContract";
import { WorkingIndicator } from "./WorkingIndicator";

const ACTIVITY_KIND_LABELS: Record<string, string> = {
  agent_message: "Mensagem do agente", tool_call: "Ferramenta iniciada", tool_result: "Ferramenta concluída",
  interaction: "Interação", lifecycle: "Etapa do runtime", warning: "Aviso do runtime",
};
const LIFECYCLE_STATUS: Record<string, string> = {
  completed: "Etapa concluída pelo runtime.", end_turn: "O turno do agente foi encerrado.",
  canceled: "O turno do agente foi cancelado.", cancelled: "O turno do agente foi cancelado.",
};
const FIRST_UPDATE_LABEL = "Aguardando a primeira atualização do agente…";
const STILL_WORKING_LABEL = "A próxima atualização da execução aparece aqui.";
const LIFECYCLE_FALLBACK = "O runtime registrou uma mudança de etapa.";

function isMachinePayload(text: string) {
  const trimmed = text.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return false;
  try { JSON.parse(trimmed); return true; } catch { return trimmed.startsWith("{\"schema\""); }
}

function detailOf(activity: NonNullable<FlowRun["activity"]>) {
  if (activity.preview && !isMachinePayload(activity.preview)) return activity.preview;
  if (activity.kind === "lifecycle") return activity.status ? LIFECYCLE_STATUS[activity.status] ?? `Estado informado: ${activity.status}.` : LIFECYCLE_FALLBACK;
  return null;
}

export function RunActivity({ activity, active }: { activity: FlowRun["activity"]; active: boolean }) {
  if (!activity && !active) return null;
  if (!activity) return <WorkingIndicator label={FIRST_UPDATE_LABEL} />;
  const detail = detailOf(activity);
  return (
    <div className="space-y-3">
      <div role="log" aria-label="Atividade recente da execução" aria-live="polite" aria-relevant="text" className="space-y-1 rounded-lg bg-surface px-3 py-2.5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-medium text-ink">{ACTIVITY_KIND_LABELS[activity.kind] ?? "Atualização da execução"}{activity.tool ? <> · <span className="font-mono text-[13px]">{activity.tool}</span></> : null}</p>
          <time className="font-mono text-xs tabular-nums text-ink-3" dateTime={activity.at}>{runClock(activity.at)}</time>
        </div>
        {activity.source && <p className="font-mono text-xs text-ink-3 [overflow-wrap:anywhere]">{activity.source}</p>}
        {detail && <p className="max-h-40 overflow-auto text-sm leading-6 whitespace-pre-wrap break-words text-ink-2">{detail}</p>}
      </div>
      {active && <WorkingIndicator label={STILL_WORKING_LABEL} />}
    </div>
  );
}
