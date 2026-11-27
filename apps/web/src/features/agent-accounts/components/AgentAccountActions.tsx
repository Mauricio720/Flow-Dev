"use client";

import { Button } from "@/components/ui/button";
import { REMOVE_LABEL, RENAME_LABEL, VERIFY_LABEL, VERIFYING_LABEL } from "../agentAccountActionCopy";
import { requestVerify, type AccountOutcome } from "../agentAccountsClient";
import { useAccountRequest } from "../hooks/useAccountRequest";
import type { AgentAccount } from "../types";

export type RowMode = "idle" | "renaming" | "removing";
type Props = { account: AgentAccount; onVerified: (account: AgentAccount) => void; onMode: (mode: RowMode) => void };
type Saved = Extract<AccountOutcome, { kind: "saved" }>;

export function AgentAccountActions({ account, onVerified, onMode }: Props) {
  const request = useAccountRequest();
  const verify = () => request.run<Saved>(() => requestVerify(account.id), (outcome) => onVerified(outcome.account));
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" disabled={request.busy} onClick={() => void verify()}>{request.busy ? VERIFYING_LABEL : VERIFY_LABEL}</Button>
        <Button type="button" variant="ghost" size="sm" disabled={request.busy} onClick={() => onMode("renaming")}>{RENAME_LABEL}</Button>
        <Button type="button" variant="ghost" size="sm" disabled={request.busy} onClick={() => onMode("removing")}>{REMOVE_LABEL}</Button>
      </div>
      {request.message && <p role="alert" className="text-sm text-destructive">{request.message}</p>}
    </div>
  );
}
