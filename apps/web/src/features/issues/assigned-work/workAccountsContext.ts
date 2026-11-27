"use client";

import { createContext, useContext } from "react";
import type { WorkAccountsState } from "./hooks/useWorkAccounts";

export const WorkAccountsContext = createContext<WorkAccountsState | null>(null);

export function useWorkAccountsContext() {
  return useContext(WorkAccountsContext);
}
