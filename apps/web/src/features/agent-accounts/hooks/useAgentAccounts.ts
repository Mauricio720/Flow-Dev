"use client";

import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import type { AgentAccount } from "../types";

export const BACKGROUND_CHECK_REREAD_MS = 4_000;

function checkedTime(account: AgentAccount | undefined) {
  return account?.checkedAt ? Date.parse(account.checkedAt) : 0;
}

function mergeFresh(current: AgentAccount[], fresh: AgentAccount[]) {
  return fresh.map((account) => {
    const known = current.find((item) => item.id === account.id);
    return known && checkedTime(known) > checkedTime(account) ? known : account;
  });
}

export function useAgentAccounts(initial: AgentAccount[]) {
  const [accounts, setAccounts] = useState(initial);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      trpc.agentAccounts.list.query().then((fresh) => { if (fresh) setAccounts((current) => mergeFresh(current, fresh)); }).catch(() => undefined);
    }, BACKGROUND_CHECK_REREAD_MS);
    return () => window.clearTimeout(timer);
  }, []);
  const add = (account: AgentAccount) => setAccounts((current) => [...current, account]);
  const replace = (account: AgentAccount) => setAccounts((current) => current.map((item) => (item.id === account.id ? account : item)));
  const drop = (id: string) => setAccounts((current) => current.filter((item) => item.id !== id));
  return { accounts, add, replace, drop };
}

export type AgentAccountsState = ReturnType<typeof useAgentAccounts>;
