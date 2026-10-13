"use client";

import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import type { DraftRuntime, FlowConnection } from "./unifiedContract";
import { connectionsFor } from "./retryWorkspace";
import { runtimeNotice } from "./runtimeAvailability";

const DEFAULT_REASONING = "";
const REASON_LABELS: Record<string, string> = { catalog_stale: "catálogo desatualizado", model_unavailable: "indisponível", auth_required: "conta desconectada" };
const SELECT_CLASS = "h-10 w-full rounded-md border border-input bg-surface px-3 text-[15px] disabled:opacity-40";
const REASONING_NEEDS_MODEL = "Escolha um modelo antes";
const REASONING_UNAVAILABLE = "Indisponível para este modelo";
const OUT_OF_CATALOG = "fora da lista atual";

type Props = { idPrefix: string; connections: FlowConnection[]; value: DraftRuntime | null; disabled: boolean; onChange: (value: DraftRuntime | null) => void; workspaceKind?: string };
type FieldProps = { id: string; label: string; value: string; disabled: boolean; onPick: (value: string) => void; children: ReactNode };

const blockedSuffix = (reason: string | null) => ` (${REASON_LABELS[reason ?? ""] ?? "indisponível"})`;

function Field({ id, label, value, disabled, onPick, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <select id={id} className={SELECT_CLASS} disabled={disabled} value={value} onChange={(event) => onPick(event.target.value)}>{children}</select>
    </div>
  );
}

export function RuntimePicker({ idPrefix, connections, value, disabled, onChange, workspaceKind }: Props) {
  const connection = connections.find((item) => item.id === value?.connectionId) ?? null;
  const offered = workspaceKind ? connectionsFor(connections, workspaceKind) : connections;
  const incompatible = connection !== null && !offered.some((item) => item.id === connection.id);
  const model = connection?.models.find((item) => item.modelId === value?.modelId) ?? null;
  const unlisted = connection && value?.modelId && !model ? value.modelId : null;
  const reasoningChoices = model?.reasoningChoices ?? [];
  const reasoning = value?.reasoningEffort ?? DEFAULT_REASONING;
  const notice = runtimeNotice(connections, value);
  const pickConnection = (connectionId: string) => onChange(connectionId ? { connectionId, modelId: "", reasoningEffort: null } : null);
  const pickModel = (modelId: string) => onChange(value && modelId ? { ...value, modelId, reasoningEffort: null } : null);
  const pickReasoning = (effort: string) => value && onChange({ ...value, reasoningEffort: effort === DEFAULT_REASONING ? null : effort });
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Field id={`${idPrefix}-connection`} label="Conexão" value={value?.connectionId ?? ""} disabled={disabled} onPick={pickConnection}>
        <option value="">Escolha uma conexão</option>
        {incompatible && <option value={connection.id} disabled>{connection.label} (incompatível com checkout)</option>}
        {offered.map((item) => <option key={item.id} value={item.id} disabled={!item.ready}>{item.label}{item.ready ? "" : blockedSuffix(item.reason)}</option>)}
      </Field>
      <Field id={`${idPrefix}-model`} label="Modelo" value={value?.modelId ?? ""} disabled={disabled || !connection} onPick={pickModel}>
        <option value="">Escolha um modelo</option>
        {unlisted && <option value={unlisted} disabled>{unlisted} ({OUT_OF_CATALOG})</option>}
        {connection?.models.map((item) => <option key={item.modelId} value={item.modelId} disabled={!item.selectable}>{item.displayName}{connection.providerKind === "opencode" ? ` (${item.modelId})` : ""}{item.selectable ? "" : blockedSuffix(item.unselectableReason)}</option>)}
      </Field>
      <Field id={`${idPrefix}-reasoning`} label="Raciocínio" value={reasoning} disabled={disabled || reasoningChoices.length === 0} onPick={pickReasoning}>
        {reasoningChoices.length === 0 && <option value={reasoning}>{model ? REASONING_UNAVAILABLE : REASONING_NEEDS_MODEL}</option>}
        {reasoningChoices.map((choice) => <option key={choice ?? DEFAULT_REASONING} value={choice ?? DEFAULT_REASONING}>{choice ?? "Padrão do provedor"}</option>)}
      </Field>
      {notice && <p role="status" className="max-w-[62ch] text-sm leading-6 text-destructive sm:col-span-3">{notice}</p>}
    </div>
  );
}
