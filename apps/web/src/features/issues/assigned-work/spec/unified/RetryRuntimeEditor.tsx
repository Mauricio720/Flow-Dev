"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { runtimeRoleLabel } from "./loopCatalogCopy";
import { RetryWorkspaceField } from "./RetryWorkspaceField";
import { connectionsFor } from "./retryWorkspace";
import { RuntimePicker } from "./RuntimePicker";
import { RETRY_PREPARING_LABEL } from "./stageCopy";
import type { DraftRuntime, FlowAction, FlowConnection, MovableWorkspaceKind, RetryRuntimeBindings } from "./unifiedContract";

type Choices = Record<string, DraftRuntime | null>;
type Props = { action: FlowAction; connections: FlowConnection[]; workspaceKinds: MovableWorkspaceKind[]; disabled: boolean; pending: boolean; onRetry: (bindings?: RetryRuntimeBindings, moveTo?: MovableWorkspaceKind) => void; onBack: () => void };

function initialRuntimes(action: FlowAction): Choices {
  return Object.fromEntries(action.bindings.map(({ role, connectionId, modelId, reasoningEffort }) => [role, { connectionId, modelId, reasoningEffort }]));
}

function unsetRuntimes(action: FlowAction): Choices {
  return Object.fromEntries(action.bindings.map(({ role }) => [role, null]));
}

function selectedBindings(action: FlowAction, connections: FlowConnection[], choices: Choices): RetryRuntimeBindings | null {
  const bindings: RetryRuntimeBindings = {};
  for (const { role } of action.bindings) {
    const choice = choices[role];
    const connection = connections.find((item) => item.id === choice?.connectionId && item.ready);
    const model = connection?.models.find((item) => item.modelId === choice?.modelId && item.selectable);
    if (!choice || !connection || !model || !model.reasoningChoices.includes(choice.reasoningEffort)) return null;
    bindings[role] = { ...choice, providerId: connection.providerKind };
  }
  return bindings;
}

function startRetry(onRetry: Props["onRetry"], bindings: RetryRuntimeBindings | null, moveTo?: MovableWorkspaceKind) {
  if (!bindings) return;
  if (moveTo) return onRetry(bindings, moveTo);
  onRetry(bindings);
}

export function RetryRuntimeEditor({ action, connections, workspaceKinds, disabled, pending, onRetry, onBack }: Props) {
  const origin = action.workspace.kind;
  const [workspaceKind, setWorkspaceKind] = useState<string>(origin);
  const [choices, setChoices] = useState(() => initialRuntimes(action));
  const offered = connectionsFor(connections, workspaceKind);
  const bindings = selectedBindings(action, offered, choices);
  const moveTo = workspaceKinds.find((kind) => kind === workspaceKind && kind !== origin);
  const pickWorkspace = (kind: string) => { setWorkspaceKind(kind); setChoices(kind === origin ? initialRuntimes(action) : unsetRuntimes(action)); };
  return (
    <div className="space-y-4 rounded-md border border-line p-4">
      <div className="space-y-1">
        <h4 className="text-sm font-semibold">Runtimes da próxima tentativa</h4>
        <p className="text-sm text-ink-2">Se a conta atingiu o limite da sessão, escolha outra conexão ou provedor. Se só o modelo ficou indisponível, escolha outro modelo. Revise o checkout antes de retomar.</p>
      </div>
      {workspaceKinds.length > 1 && <RetryWorkspaceField id={`retry-${action.id}-workspace`} kinds={workspaceKinds} value={workspaceKind} moved={Boolean(moveTo)} disabled={disabled} onChange={pickWorkspace} />}
      {action.bindings.map(({ role }) => (
        <fieldset key={role} className="space-y-2">
          <legend className="text-sm font-medium">{role === "main" ? "Agente" : runtimeRoleLabel(role)}</legend>
          <RuntimePicker idPrefix={`retry-${action.id}-${role}`} connections={offered} value={choices[role] ?? null} disabled={disabled} onChange={(runtime) => setChoices((current) => ({ ...current, [role]: runtime }))} />
        </fieldset>
      ))}
      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={disabled || !bindings} onClick={() => startRetry(onRetry, bindings, moveTo)}>{pending ? RETRY_PREPARING_LABEL : "Iniciar com estes runtimes"}</Button>
        <Button type="button" variant="outline" disabled={disabled} onClick={onBack}>Voltar</Button>
      </div>
    </div>
  );
}
