"use client";

import { Button } from "@/components/ui/button";
import { CANCEL_LABEL, REMOVE_SUBMIT_LABEL, REMOVING_LABEL, removeQuestion } from "../agentAccountActionCopy";
import { requestRemove, type RemovalOutcome } from "../agentAccountsClient";
import { useAccountRequest } from "../hooks/useAccountRequest";
import type { AgentAccount } from "../types";

type Props = { account: AgentAccount; onRemoved: (id: string) => void; onClose: () => void };
type Removed = Extract<RemovalOutcome, { kind: "removed" }>;

export function AgentAccountRemoveConfirm({ account, onRemoved, onClose }: Props) {
  const request = useAccountRequest();
  const remove = () => request.run<Removed>(() => requestRemove(account.id), () => onRemoved(account.id));
  return (
    <div role="group" aria-label={REMOVE_SUBMIT_LABEL} className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-3">
      <p className="text-sm text-ink-2">{removeQuestion(account.label)}</p>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" disabled={request.busy} onClick={() => void remove()}>{request.busy ? REMOVING_LABEL : REMOVE_SUBMIT_LABEL}</Button>
        <Button type="button" variant="ghost" size="sm" disabled={request.busy} onClick={onClose}>{CANCEL_LABEL}</Button>
      </div>
      {request.message && <p role="alert" className="text-sm text-destructive">{request.message}</p>}
    </div>
  );
}
