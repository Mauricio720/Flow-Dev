"use client";

import { useState } from "react";
import { requestCreate } from "../agentAccountsClient";
import type { AgentAccount, AgentAccountProvider } from "../types";
import { useSessionExpiry } from "./useSessionExpiry";

type State = { provider: AgentAccountProvider; label: string; saving: boolean; created: boolean; message: string | null };

export function useCreateAccount(onCreated: (account: AgentAccount) => void) {
  const leave = useSessionExpiry();
  const [state, setState] = useState<State>({ provider: "claude", label: "", saving: false, created: false, message: null });
  const patch = (changes: Partial<State>) => setState((current) => ({ ...current, ...changes }));
  async function submit() {
    if (state.saving) return;
    patch({ saving: true, created: false, message: null });
    const outcome = await requestCreate({ provider: state.provider, label: state.label });
    if (outcome.kind === "unauthorized") return leave();
    if (outcome.kind === "failed") return patch({ saving: false, message: outcome.message });
    patch({ saving: false, created: true, label: "" });
    onCreated(outcome.account);
  }
  const chooseProvider = (provider: AgentAccountProvider) => patch({ provider, message: null });
  const edit = (label: string) => patch({ label, created: false, message: null });
  return { ...state, chooseProvider, edit, submit };
}
