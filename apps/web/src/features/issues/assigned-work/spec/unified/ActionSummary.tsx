import { ACTIVE_RUN_STATES } from "./flowStages";
import type { FlowAction } from "./unifiedContract";
import { RUN_STATE_LABELS } from "./unifiedCopy";

const WORKSPACE_LABELS: Record<string, string> = { isolated: "Checkout isolado", local: "Projeto local vinculado", existing: "Worktree existente", new: "Novo worktree gerenciado" };
const SUCCEEDED_STATE = "succeeded";

function bindingLine(binding: FlowAction["bindings"][number]) {
  const role = binding.role !== "main" ? `${binding.role}: ` : "";
  return `${role}${binding.connectionLabel ?? "conexão removida"} · ${binding.modelId} · raciocínio ${binding.reasoningEffort ?? "padrão do provedor"}`;
}

export function ActionSummary({ index, label, action }: { index: number; label: string; action: FlowAction }) {
  const workspace = WORKSPACE_LABELS[(action.workspace as { kind?: string }).kind ?? ""] ?? "Checkout isolado";
  return (
    <li className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3">
      <div className="min-w-0 space-y-0.5">
        <h4 className="text-[15px] font-semibold">{index + 1}. {label}</h4>
        <p className="text-xs leading-5 text-ink-3">{action.bindings.map(bindingLine).join(" / ")} · {workspace}</p>
      </div>
      <p className={`flex items-center gap-2 text-sm ${action.state === SUCCEEDED_STATE ? "text-ink-2" : "font-medium text-ink"}`}>
        {ACTIVE_RUN_STATES.includes(action.state) && <span aria-hidden="true" className="node-running size-2 rounded-full bg-ink" />}
        {RUN_STATE_LABELS[action.state] ?? action.state}
      </p>
    </li>
  );
}
