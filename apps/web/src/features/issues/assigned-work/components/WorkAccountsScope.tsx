"use client";

import type { ReactNode } from "react";
import { useWorkAccounts } from "../hooks/useWorkAccounts";
import { WorkAccountsContext } from "../workAccountsContext";

type Props = { taskId: string; operate: boolean; children: ReactNode };

export function WorkAccountsScope({ taskId, operate, children }: Props) {
  const accounts = useWorkAccounts(taskId, operate);
  return <WorkAccountsContext.Provider value={operate && accounts.data ? accounts : null}>{children}</WorkAccountsContext.Provider>;
}
