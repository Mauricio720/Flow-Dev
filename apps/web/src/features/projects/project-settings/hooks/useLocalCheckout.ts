"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { expiredSessionPath, projectSettingsPath } from "@/lib/navigation/projectRoutes";
import type { LocalCheckout } from "@/lib/projects/contract";
import { requestPickFolder, requestRemove, requestSave, type CheckoutOutcome, type PickOutcome } from "../localCheckoutClient";

type Status = "editing" | "saving" | "picking" | "saved" | "removed";
type State = { saved: LocalCheckout; path: string; status: Status; message: string | null };

export function useLocalCheckout(projectId: string, initial: LocalCheckout) {
  const router = useRouter();
  const [state, setState] = useState<State>({ saved: initial, path: initial?.path ?? "", status: "editing", message: null });
  const patch = (changes: Partial<State>) => setState((current) => ({ ...current, ...changes }));
  function apply(outcome: CheckoutOutcome) {
    if (outcome.kind === "unauthorized") return router.replace(expiredSessionPath(projectSettingsPath(projectId)));
    if (outcome.kind === "failed") return patch({ status: "editing", message: outcome.message });
    const saved = outcome.kind === "saved" ? outcome.checkout : null;
    patch({ saved, path: saved?.path ?? "", status: outcome.kind });
  }
  async function save() {
    if (state.status === "saving") return;
    patch({ status: "saving", message: null });
    apply(await requestSave({ projectId, path: state.path, expectedVersion: state.saved?.version ?? 0 }));
  }
  async function remove() {
    patch({ message: null });
    apply(await requestRemove(projectId));
  }
  function applyPick(outcome: PickOutcome) {
    if (outcome.kind === "unauthorized") return router.replace(expiredSessionPath(projectSettingsPath(projectId)));
    if (outcome.kind === "failed") return patch({ status: "editing", message: outcome.message });
    patch(outcome.kind === "picked" ? { path: outcome.path, status: "editing" } : { status: "editing" });
  }
  async function pick() {
    if (state.status === "saving" || state.status === "picking") return;
    patch({ status: "picking", message: null });
    applyPick(await requestPickFolder(projectId));
  }
  const edit = (path: string) => patch({ path, status: "editing", message: null });
  return { ...state, edit, save, remove, pick };
}

export type LocalCheckoutEditor = ReturnType<typeof useLocalCheckout>;
