"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { runtimeRoleLabel } from "./loopCatalogCopy";
import { RetryWorkspaceField } from "./RetryWorkspaceField";
import { connectionsFor } from "./retryWorkspace";
import { RuntimePicker } from "./RuntimePicker";
import { usableModel } from "./runtimeAvailability";
import { RETRY_COPY, RETRY_PREPARING_LABEL } from "./stageCopy";
import type { DraftRuntime, FlowAction, FlowConnection, MovableWorkspaceKind, RetryRuntimeBindings } from "./unifiedContract";

type Choices = Record<string, DraftRuntime | null>;
type Props = { action: FlowAction; roles: string[]; connections: FlowConnection[]; workspaceKinds: MovableWorkspaceKind[]; disabled: boolean; pending: boolean; onRetry: (bindings?: RetryRuntimeBindings, moveTo?: MovableWorkspaceKind) => void; onBack: () => void };

// A role the last attempt did not have starts from its single choice, so only the model that should differ needs changing.
function initialRuntimes(action: FlowAction, roles: string[]): Choices {
  const shared = action.bindings.length === 1 ? action.bindings[0] : undefined;
  return Object.fromEntries(roles.map((role) => {
    const previous = action.bindings.find((binding) => binding.role === role) ?? shared;
    return [role, previous ? { connectionId: previous.connectionId, modelId: previous.modelId, reasoningEffort: previous.reasoningEffort } : null];
  }));
}

function unsetRuntimes(roles: string[]): Choices {
  return Object.fromEntries(roles.map((role) => [role, null]));
}

function roleBinding(connections: FlowConnection[], choice: DraftRuntime | null) {
  const connection = connections.find((item) => item.id === choice?.connectionId && item.ready);
  const model = usableModel(connections, choice);
  if (!choice || !connection || !model || !model.reasoningChoices.includes(choice.reasoningEffort)) return null;
  return { ...choice, providerId: connection.providerKind };
}

function resolveChoices(roles: string[], connections: FlowConnection[], choices: Choices) {
  const bindings: RetryRuntimeBindings = {};
  const missing: string[] = [];
  for (const role of roles) {
    const binding = roleBinding(connections, choices[role] ?? null);
    if (binding) bindings[role] = binding;
    else missing.push(runtimeRoleLabel(role));
  }
  return { bindings: missing.length > 0 ? null : bindings, missing };
}

function startRetry(onRetry: Props["onRetry"], bindings: RetryRuntimeBindings | null, moveTo?: MovableWorkspaceKind) {
  if (!bindings) return;
  if (moveTo) return onRetry(bindings, moveTo);
  onRetry(bindings);
}

export function RetryRuntimeEditor({ action, roles, connections, workspaceKinds, disabled, pending, onRetry, onBack }: Props) {
  const origin = action.workspace.kind;
  const [workspaceKind, setWorkspaceKind] = useState<string>(origin);
  const [choices, setChoices] = useState(() => initialRuntimes(action, roles));
  const { bindings, missing } = resolveChoices(roles, connectionsFor(connections, workspaceKind), choices);
  const moveTo = workspaceKinds.find((kind) => kind === workspaceKind && kind !== origin);
  const pickWorkspace = (kind: string) => { setWorkspaceKind(kind); setChoices(kind === origin ? initialRuntimes(action, roles) : unsetRuntimes(roles)); };
  const workspaceChoices = [origin, ...workspaceKinds.filter((kind) => kind !== origin)];
  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h4 className="text-sm font-semibold">{RETRY_COPY.editorTitle}</h4>
        <p className="max-w-[62ch] text-sm leading-6 text-ink-2">{RETRY_COPY.editorHelp}</p>
      </div>
      {workspaceKinds.length > 0 && <RetryWorkspaceField id={`retry-${action.id}-workspace`} kinds={workspaceChoices} value={workspaceKind} moved={Boolean(moveTo)} disabled={disabled} onChange={pickWorkspace} />}
      {roles.map((role) => (
        <fieldset key={role} className="space-y-2">
          <legend className="text-sm font-medium">{runtimeRoleLabel(role)}</legend>
          <RuntimePicker idPrefix={`retry-${action.id}-${role}`} connections={connections} workspaceKind={workspaceKind} value={choices[role] ?? null} disabled={disabled} onChange={(runtime) => setChoices((current) => ({ ...current, [role]: runtime }))} />
        </fieldset>
      ))}
      {missing.length > 0 && <p className="text-sm text-ink-2" role="status">{RETRY_COPY.missing} {missing.join(", ")}.</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={disabled || !bindings} onClick={() => startRetry(onRetry, bindings, moveTo)}>{pending ? RETRY_PREPARING_LABEL : RETRY_COPY.confirm}</Button>
        <Button type="button" variant="outline" disabled={disabled} onClick={onBack}>{RETRY_COPY.back}</Button>
      </div>
    </div>
  );
}
