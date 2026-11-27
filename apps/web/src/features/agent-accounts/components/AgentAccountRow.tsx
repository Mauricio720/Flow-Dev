"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { PROVIDER_LABEL, STATUS_LABEL, planNote } from "../agentAccountStatusCopy";
import type { AgentAccount } from "../types";
import { AgentAccountActions, type RowMode } from "./AgentAccountActions";
import { AgentAccountRemoveConfirm } from "./AgentAccountRemoveConfirm";
import { AgentAccountRename } from "./AgentAccountRename";
import { LoginCommandField } from "./LoginCommandField";

const STATUSES_NEEDING_LOGIN = new Set<AgentAccount["status"]>(["pending_login", "logged_out"]);
export type AccountRowHandlers = { onChange: (account: AgentAccount) => void; onRemoved: (id: string) => void };

function Identity({ account }: { account: AgentAccount }) {
  if (account.status !== "logged_in" || !account.identity) return null;
  return (
    <p className="text-sm text-ink-2">
      <span className="[overflow-wrap:anywhere]">{account.identity}</span>
      {account.plan && <span className="text-ink-3"> · {planNote(account.plan)}</span>}
    </p>
  );
}

export function AgentAccountRow({ account, handlers }: { account: AgentAccount; handlers: AccountRowHandlers }) {
  const [mode, setMode] = useState<RowMode>("idle");
  const close = () => setMode("idle");
  return (
    <li aria-label={account.label} className="flex flex-col gap-3 px-5 py-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className="text-[15px] font-medium">{account.label}</p>
        <p className="text-sm text-ink-3">{PROVIDER_LABEL[account.provider]}</p>
        <Badge variant="outline" className="ml-auto">{STATUS_LABEL[account.status]}</Badge>
      </div>
      <Identity account={account} />
      {STATUSES_NEEDING_LOGIN.has(account.status) && <LoginCommandField command={account.loginCommand} />}
      {mode === "idle" && <AgentAccountActions account={account} onVerified={handlers.onChange} onMode={setMode} />}
      {mode === "renaming" && <AgentAccountRename account={account} onRenamed={handlers.onChange} onClose={close} />}
      {mode === "removing" && <AgentAccountRemoveConfirm account={account} onRemoved={handlers.onRemoved} onClose={close} />}
    </li>
  );
}
