import { runtimeRoleLabel } from "./loopCatalogCopy";
import { usableModel } from "./runtimeAvailability";
import type { FlowAction, FlowConnection } from "./unifiedContract";

type Binding = FlowAction["bindings"][number];
type Props = { label: string; bindings: Binding[]; connections: FlowConnection[] };

const DEFAULT_REASONING = "padrão do provedor";
const REMOVED_CONNECTION = "conexão removida";
const UNAVAILABLE_NOW = "indisponível agora";

function choiceLine(binding: Binding, connections: FlowConnection[]) {
  const connection = connections.find((item) => item.id === binding.connectionId);
  const model = connection?.models.find((item) => item.modelId === binding.modelId);
  return `${connection?.label ?? binding.connectionLabel ?? REMOVED_CONNECTION} · ${model?.displayName ?? binding.modelId} · raciocínio ${binding.reasoningEffort ?? DEFAULT_REASONING}`;
}

export function RuntimeChoiceList({ label, bindings, connections }: Props) {
  return (
    <dl aria-label={label} className="divide-y divide-line border-y border-line text-sm">
      {bindings.map((binding) => (
        <div key={binding.role} className="grid gap-x-4 gap-y-0.5 py-2 sm:grid-cols-[8.5rem_minmax(0,1fr)]">
          <dt className="text-ink-3">{runtimeRoleLabel(binding.role)}</dt>
          <dd className="min-w-0 text-ink-2 [overflow-wrap:anywhere]">
            {choiceLine(binding, connections)}
            {!usableModel(connections, binding) && <span className="text-destructive"> · {UNAVAILABLE_NOW}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}
