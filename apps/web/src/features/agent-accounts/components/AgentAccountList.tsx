"use client";

import { AGENT_ACCOUNTS_EMPTY_NOTE, AGENT_ACCOUNTS_LIST_LABEL } from "../agentAccountStatusCopy";
import type { AgentAccount } from "../types";
import { AgentAccountRow, type AccountRowHandlers } from "./AgentAccountRow";

type Props = { accounts: AgentAccount[]; handlers: AccountRowHandlers };

export function AgentAccountList({ accounts, handlers }: Props) {
  if (accounts.length === 0) return <p className="text-sm text-ink-3">{AGENT_ACCOUNTS_EMPTY_NOTE}</p>;
  return (
    <ul aria-label={AGENT_ACCOUNTS_LIST_LABEL} className="divide-y divide-line rounded-xl border border-line bg-raised">
      {accounts.map((account) => <AgentAccountRow key={account.id} account={account} handlers={handlers} />)}
    </ul>
  );
}
