"use client";

import { Label } from "@/components/ui/label";
import type { DraftRuntime, FlowConnection } from "./unifiedContract";

const DEFAULT_REASONING = "";
const REASON_LABELS: Record<string, string> = { catalog_stale: "catálogo desatualizado", model_unavailable: "indisponível", auth_required: "conta desconectada" };
const SELECT_CLASS = "h-10 w-full rounded-md border border-input bg-surface px-3 text-[15px] disabled:opacity-40";

type Props = { idPrefix: string; connections: FlowConnection[]; value: DraftRuntime | null; disabled: boolean; onChange: (value: DraftRuntime | null) => void };

export function RuntimePicker({ idPrefix, connections, value, disabled, onChange }: Props) {
  const connection = connections.find((item) => item.id === value?.connectionId) ?? null;
  const model = connection?.models.find((item) => item.modelId === value?.modelId) ?? null;

  const pickConnection = (connectionId: string) => onChange(connectionId ? { connectionId, modelId: "", reasoningEffort: null } : null);
  const pickModel = (modelId: string) => onChange(value && modelId ? { ...value, modelId, reasoningEffort: null } : null);
  const pickReasoning = (effort: string) => value && onChange({ ...value, reasoningEffort: effort === DEFAULT_REASONING ? null : effort });

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-connection`}>Conexão</Label>
        <select id={`${idPrefix}-connection`} className={SELECT_CLASS} disabled={disabled} value={value?.connectionId ?? ""} onChange={(event) => pickConnection(event.target.value)}>
          <option value="">Escolha uma conexão</option>
          {connections.map((item) => <option key={item.id} value={item.id} disabled={!item.ready}>{item.label}{item.ready ? "" : ` (${REASON_LABELS[item.reason ?? ""] ?? "indisponível"})`}</option>)}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-model`}>Modelo</Label>
        <select id={`${idPrefix}-model`} className={SELECT_CLASS} disabled={disabled || !connection} value={value?.modelId ?? ""} onChange={(event) => pickModel(event.target.value)}>
          <option value="">Escolha um modelo</option>
          {connection?.models.map((item) => <option key={item.modelId} value={item.modelId} disabled={!item.selectable}>{item.displayName}{item.selectable ? "" : ` (${REASON_LABELS[item.unselectableReason ?? ""] ?? "indisponível"})`}</option>)}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-reasoning`}>Raciocínio</Label>
        <select id={`${idPrefix}-reasoning`} className={SELECT_CLASS} disabled={disabled || !model} value={value?.reasoningEffort ?? DEFAULT_REASONING} onChange={(event) => pickReasoning(event.target.value)}>
          {model?.reasoningChoices.map((choice) => <option key={choice ?? DEFAULT_REASONING} value={choice ?? DEFAULT_REASONING}>{choice ?? "Padrão do provedor"}</option>)}
        </select>
      </div>
    </div>
  );
}
