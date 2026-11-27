"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { CANCEL_LABEL, RENAME_FIELD_LABEL, RENAME_SAVING_LABEL, RENAME_SUBMIT_LABEL } from "../agentAccountActionCopy";
import { requestRename, type AccountOutcome } from "../agentAccountsClient";
import { useAccountRequest } from "../hooks/useAccountRequest";
import type { AgentAccount } from "../types";

type Props = { account: AgentAccount; onRenamed: (account: AgentAccount) => void; onClose: () => void };
type Saved = Extract<AccountOutcome, { kind: "saved" }>;

export function AgentAccountRename({ account, onRenamed, onClose }: Props) {
  const [label, setLabel] = useState(account.label);
  const request = useAccountRequest();
  const fieldId = `agent-account-rename-${account.id}`;
  function submit(event: FormEvent) {
    event.preventDefault();
    void request.run<Saved>(() => requestRename({ id: account.id, label, version: account.version }), (outcome) => { onRenamed(outcome.account); onClose(); });
  }
  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-2">
      <label htmlFor={fieldId} className="text-sm font-medium">{RENAME_FIELD_LABEL}</label>
      <div className="flex flex-wrap items-center gap-2">
        <input id={fieldId} type="text" value={label} onChange={(event) => { setLabel(event.target.value); request.clear(); }} disabled={request.busy} aria-invalid={request.message ? true : undefined} className="h-10 min-w-48 flex-1 rounded-lg border border-line bg-surface px-3 text-[15px]" />
        <Button type="submit" size="sm" disabled={request.busy}>{request.busy ? RENAME_SAVING_LABEL : RENAME_SUBMIT_LABEL}</Button>
        <Button type="button" variant="ghost" size="sm" disabled={request.busy} onClick={onClose}>{CANCEL_LABEL}</Button>
      </div>
      {request.message && <p role="alert" className="text-sm text-destructive">{request.message}</p>}
    </form>
  );
}
