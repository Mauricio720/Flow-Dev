"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { draftToInput, type DraftContext } from "./draftToInput";
import type { DraftAction, FlowTarget, MovableWorkspaceKind, PlanActionInput, RetryRuntimeBindings } from "./unifiedContract";
import { CONCLUDE_COPY } from "./stageCopy";
import { describeFailure } from "./unifiedReasons";
import { SETTLED_PREPARATION_STATES, usePreparationPolling, type Preparation } from "./usePreparationPolling";

type Notice = { tone: "ok" | "error"; text: string } | null;
const INCOMPLETE_CHOICE = "Escolha conexão, modelo, raciocínio e checkout em cada ação. Se escolher um worktree, informe um nome ou selecione um válido antes de salvar.";

export function useFlowCommands(target: FlowTarget, onChanged: () => Promise<void>) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [preparations, setPreparations] = useState<Record<string, Preparation>>({});
  const [autoRetry, setAutoRetry] = useState<{ actionId: string; expectedRevision: number; runtimeBindings?: RetryRuntimeBindings } | null>(null);

  async function run(operation: () => Promise<unknown>, success: string, actionId?: string) {
    setBusy(true);
    try {
      await operation();
      setNotice({ tone: "ok", text: success });
    } catch (error) {
      const failure = describeFailure(error);
      setNotice({ tone: "error", text: failure.message });
      if (actionId && ["preparation_expired", "preparation_changed"].includes(failure.reason ?? "")) {
        setPreparations((current) => current[actionId] ? { ...current, [actionId]: { ...current[actionId], state: "expired", reason: failure.reason } } : current);
      }
    } finally {
      await onChanged();
      setBusy(false);
    }
  }

  const savePlan = (input: { draft: DraftAction[]; expectedRevision: number; context: DraftContext }) => {
    const actions = input.draft.map((action) => draftToInput(action, input.context));
    if (actions.some((action) => action === null)) return Promise.resolve(setNotice({ tone: "error", text: INCOMPLETE_CHOICE }));
    return run(() => trpc.taskFlow.savePlan.mutate({ ...target, actions: actions as PlanActionInput[], expectedRevision: input.expectedRevision, idempotencyKey: crypto.randomUUID() }), "Fluxo salvo. Salvar não inicia nenhuma ação.");
  };

  const prepareLocalAction = async (input: { actionId: string; expectedRevision: number; runtimeBindings?: RetryRuntimeBindings }) => {
    setBusy(true);
    try {
      const result = await trpc.taskFlow.prepareLocalAction.mutate({ ...target, ...input, requestKey: crypto.randomUUID() });
      setPreparations((current) => ({ ...current, [input.actionId]: { id: result.preparationId, state: "queued" } }));
      setNotice({ tone: "ok", text: "Preparação enviada ao seu conector local." });
      return true;
    } catch (error) { setNotice({ tone: "error", text: describeFailure(error).message }); return false; }
    finally { await onChanged(); setBusy(false); }
  };

  const startAction = (input: { actionId: string; expectedRevision: number; preparationId?: string }) =>
    run(() => trpc.taskFlow.startAction.mutate({ ...target, ...input, idempotencyKey: crypto.randomUUID() }), "Ação iniciada.", input.actionId);

  const retryAction = (input: { actionId: string; expectedRevision: number; preparationId?: string; runtimeBindings?: RetryRuntimeBindings }) =>
    run(() => trpc.taskFlow.retryAction.mutate({ ...target, ...input, idempotencyKey: crypto.randomUUID() }), "Nova tentativa iniciada com a escolha confirmada agora.", input.actionId);

  const continueAutoRetry = (actionId: string, preparation: Preparation) => {
    if (autoRetry?.actionId !== actionId || (preparation.state !== "ready" && !SETTLED_PREPARATION_STATES.includes(preparation.state))) return;
    setAutoRetry(null);
    if (preparation.state === "ready") void retryAction({ ...autoRetry, preparationId: preparation.id });
  };

  const moveAction = (input: { actionId: string; expectedRevision: number; runtimeBindings?: RetryRuntimeBindings; moveTo: MovableWorkspaceKind }) =>
    trpc.taskFlow.moveAction.mutate({ ...target, actionId: input.actionId, expectedRevision: input.expectedRevision, workspace: { kind: input.moveTo }, runtimeBindings: input.runtimeBindings ?? {} })
      .then((moved) => moved.revision, async (error) => { setNotice({ tone: "error", text: describeFailure(error).message }); await onChanged(); return null; });

  const retryFailedAction = async (input: { actionId: string; expectedRevision: number; local: boolean; runtimeBindings?: RetryRuntimeBindings; moveTo?: MovableWorkspaceKind }) => {
    const movedRevision = input.moveTo ? await moveAction({ ...input, moveTo: input.moveTo }) : undefined;
    if (movedRevision === null) return;
    const retry = { actionId: input.actionId, expectedRevision: movedRevision ?? input.expectedRevision, ...(input.runtimeBindings && !input.moveTo ? { runtimeBindings: input.runtimeBindings } : {}) };
    if (!input.local) return retryAction(retry);
    setAutoRetry(retry);
    if (!(await prepareLocalAction(retry))) setAutoRetry(null);
  };

  usePreparationPolling(target, preparations, setPreparations, continueAutoRetry);

  const cancelRun = (runId: string) =>
    run(() => trpc.taskFlow.cancelRun.mutate({ ...target, runId, idempotencyKey: crypto.randomUUID() }), "Pedido de cancelamento concluído. Nenhuma outra ação foi iniciada.");

  const concludeReview = (input: { actionId: string; expectedRevision: number }) => run(() => trpc.taskFlow.concludeReview.mutate({ ...target, ...input }), CONCLUDE_COPY.done);
  const approvePackage = (input: { packageId: string; version: number }) =>
    run(() => trpc.taskFlow.approvePackage.mutate({ ...target, ...input, idempotencyKey: crypto.randomUUID() }), "Pacote aprovado. Escolha e inicie a próxima ação no fluxo.");

  return { busy, notice, savePlan, prepareLocalAction, preparations, startAction, retryAction, retryFailedAction, retryPending: autoRetry !== null, cancelRun, approvePackage, concludeReview };
}
