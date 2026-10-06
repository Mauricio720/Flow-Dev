import type { ToolActivity } from "../contract";
import type { DraftSource, SourceKind } from "../draftSources";
import { OUTCOME_LABEL, SOURCE_INK, SOURCE_KINDS, SOURCE_LABEL, SOURCE_SWATCH, TOOL_SOURCE } from "../toolModel";
import { SourceEntry } from "./SourceEntry";

const NO_ACTIVITY = "Nenhuma consulta foi registrada nesta tarefa.";
const NO_LOOKUPS = "Nenhuma consulta registrada.";
const NO_SOURCES = "O draft atual não cita fontes.";
const NO_DRAFT = "Ainda não há draft nesta tarefa, então não há fontes citadas.";

type Props = { activity: ToolActivity[]; sources: DraftSource[]; hasDraft: boolean; planningBasis?: number | null };
type GroupProps = { source: SourceKind; calls: ToolActivity[] };

function ActivityGroup({ source, calls }: GroupProps) {
  return (
    <div>
      <h3 className={`flex items-center gap-2 text-sm font-medium ${SOURCE_INK[source]}`}>
        <span className={`h-[3px] w-4 rounded-full ${SOURCE_SWATCH[source]}`} aria-hidden="true" />
        {SOURCE_LABEL[source]}
        <span className="ml-auto font-mono text-xs text-ink-3 tabular-nums">{calls.length}</span>
      </h3>
      {calls.length === 0 && <p className="mt-2 pl-6 text-xs text-ink-3">{NO_LOOKUPS}</p>}
      <ul className="mt-2 space-y-2 pl-6">
        {calls.map((call) => (
          <li key={call.toolCallId} className="min-w-0">
            <p className="font-mono text-[12.5px] text-ink [overflow-wrap:anywhere]">{call.target}</p>
            <p className="text-xs text-ink-3"><span className="font-mono">{call.tool}</span> · {OUTCOME_LABEL[call.status]} · <span className="font-mono tabular-nums">{call.durationMs}ms</span></p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SourcesPanel({ activity, sources, hasDraft, planningBasis = null }: Props) {
  return (
    <aside aria-label="Contexto consultado" className="flex h-full flex-col gap-8 overflow-y-auto px-5 py-5">
      <section>
        <h2 className="text-sm font-semibold">Contexto consultado</h2>
        <p className="mt-1 text-xs leading-relaxed text-ink-3">{activity.length ? "O que o Issue Author consultou nesta tarefa." : NO_ACTIVITY}</p>
        {activity.length > 0 && (
          <div className="mt-5 space-y-6">
            {SOURCE_KINDS.map((source) => <ActivityGroup key={source} source={source} calls={activity.filter((call) => TOOL_SOURCE[call.tool] === source)} />)}
          </div>
        )}
      </section>
      {planningBasis !== null && (
        <section aria-label="Base do planejamento">
          <h2 className="text-sm font-semibold">Base do planejamento</h2>
          <p className="mt-1 text-xs leading-relaxed text-ink-3">O Dev Control analisou somente o snapshot da Issue publicada (#{planningBasis}). Não houve consultas ao repositório nem citações adicionais.</p>
        </section>
      )}
      <section>
        <h2 className="text-sm font-semibold">Fontes do draft</h2>
        {sources.length === 0 && <p className="mt-1 text-xs leading-relaxed text-ink-3">{hasDraft ? NO_SOURCES : NO_DRAFT}</p>}
        <ul aria-label="Fontes do draft" className="mt-3 space-y-4">{sources.map((source) => <SourceEntry key={source.key} source={source} />)}</ul>
      </section>
    </aside>
  );
}
