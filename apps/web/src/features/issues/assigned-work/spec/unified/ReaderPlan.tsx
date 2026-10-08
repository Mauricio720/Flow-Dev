import { ownsStep, type FlowTab } from "./flowTabs";
import type { FlowPlan } from "./unifiedContract";
import { ACTION_LABELS, RUN_STATE_LABELS } from "./unifiedCopy";

const EMPTY_STAGE = "Nenhuma ação foi adicionada a esta etapa ainda.";
const LANGUAGE_LABELS: Record<string, string> = { "pt-BR": "Português (Brasil)", en: "English" };

export function ReaderPlan({ plan, tab }: { plan: FlowPlan | null; tab: FlowTab }) {
  if (!plan) return <p className="text-sm text-ink-2">Nenhum fluxo foi selecionado ainda.</p>;
  const actions = plan.actions.filter((action) => ownsStep(tab, action));
  if (actions.length === 0) return <p className="text-sm text-ink-2">{EMPTY_STAGE}</p>;
  return (
    <ol className="divide-y divide-line border-y border-line" aria-label="Ações do fluxo">
      {actions.map((action) => (
        <li key={action.id} className="space-y-0.5 py-3 text-sm">
          <p className="font-medium">{action.position}. {ACTION_LABELS[action.kind]} · {RUN_STATE_LABELS[action.state] ?? action.state}</p>
          {action.kind !== "loop" && <p className="text-ink-2">Idioma: {LANGUAGE_LABELS[String(action.inputs.language)] ?? "Português (Brasil)"}</p>}
          {action.bindings.map((binding) => <p key={binding.role} className="text-ink-2">{binding.providerId} · {binding.modelId} · raciocínio {binding.reasoningEffort ?? "padrão do provedor"} · {binding.connectionLabel ?? "conexão removida"}{binding.connectionAvailable ? "" : " (indisponível hoje)"}</p>)}
        </li>
      ))}
    </ol>
  );
}
