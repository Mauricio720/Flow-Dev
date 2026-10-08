"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RetryRuntimeEditor } from "./RetryRuntimeEditor";
import type { FlowAction, FlowConnection, MovableWorkspaceKind, RetryRuntimeBindings } from "./unifiedContract";
import { RETRY_LABEL, RETRY_PREPARING_LABEL } from "./stageCopy";

type Props = { action: FlowAction; connections: FlowConnection[]; workspaceKinds?: MovableWorkspaceKind[]; busy: boolean; pending: boolean; onRetry: (bindings?: RetryRuntimeBindings, moveTo?: MovableWorkspaceKind) => void };

export function RetryRuntimeForm({ action, connections, workspaceKinds = [], busy, pending, onRetry }: Props) {
  const [editing, setEditing] = useState(false);
  const disabled = busy || pending;
  if (editing) return <RetryRuntimeEditor action={action} connections={connections} workspaceKinds={workspaceKinds} disabled={disabled} pending={pending} onRetry={onRetry} onBack={() => setEditing(false)} />;
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" disabled={disabled} onClick={() => setEditing(true)}>Trocar runtime e retomar</Button>
      <Button type="button" variant="outline" disabled={disabled} onClick={() => onRetry()}>{pending ? RETRY_PREPARING_LABEL : RETRY_LABEL}</Button>
    </div>
  );
}
