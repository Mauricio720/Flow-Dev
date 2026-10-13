"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LastFailure } from "./LastFailure";
import { PreparationFailure, type LocalPreparation } from "./PreparationFailure";
import { RetryRuntimeEditor } from "./RetryRuntimeEditor";
import { connectionsFor } from "./retryWorkspace";
import { RuntimeChoiceList } from "./RuntimeChoiceList";
import { usableModel } from "./runtimeAvailability";
import type { FlowAction, FlowConnection, FlowRun, MovableWorkspaceKind, RetryRuntimeBindings } from "./unifiedContract";
import { RETRY_COPY, RETRY_LABEL, RETRY_PREPARING_LABEL } from "./stageCopy";

type Props = { action: FlowAction; renewedRoles?: string[] | null; connections: FlowConnection[]; workspaceKinds?: MovableWorkspaceKind[]; busy: boolean; pending: boolean; lastRun?: FlowRun | null; preparation?: LocalPreparation; onRetry: (bindings?: RetryRuntimeBindings, moveTo?: MovableWorkspaceKind) => void };

function sameChoiceBlock(action: FlowAction, compatible: FlowConnection[]) {
  if (!action.bindings.every((binding) => compatible.some((connection) => connection.id === binding.connectionId))) return RETRY_COPY.incompatible;
  return action.bindings.every((binding) => usableModel(compatible, binding)) ? null : RETRY_COPY.unavailable;
}

export function RetryRuntimeForm({ action, renewedRoles = null, connections, workspaceKinds = [], busy, pending, lastRun = null, preparation, onRetry }: Props) {
  const [editing, setEditing] = useState(false);
  const disabled = busy || pending;
  const compatible = connectionsFor(connections, action.workspace.kind);
  const blocked = renewedRoles ? RETRY_COPY.renewed : sameChoiceBlock(action, compatible);
  return (
    <div className="space-y-4">
      {lastRun && <LastFailure run={lastRun} />}
      {editing && <RetryRuntimeEditor action={action} roles={renewedRoles ?? action.bindings.map((binding) => binding.role)} connections={connections} workspaceKinds={workspaceKinds} disabled={disabled} pending={pending} onRetry={onRetry} onBack={() => setEditing(false)} />}
      {!editing && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">{RETRY_COPY.title}</h4>
          <RuntimeChoiceList label={RETRY_COPY.lastChoice} bindings={action.bindings} connections={compatible} />
          {blocked && <p className="max-w-[62ch] text-sm leading-6 text-ink-2" role="status">{blocked}</p>}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant={blocked ? "outline" : "default"} disabled={disabled || blocked !== null} onClick={() => onRetry()}>{pending ? RETRY_PREPARING_LABEL : RETRY_LABEL}</Button>
            <Button type="button" variant={blocked ? "default" : "outline"} disabled={disabled} onClick={() => setEditing(true)}>{RETRY_COPY.change}</Button>
          </div>
        </div>
      )}
      <PreparationFailure preparation={preparation} />
    </div>
  );
}
