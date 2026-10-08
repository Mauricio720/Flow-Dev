"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { draftToInput, type DraftContext } from "./draftToInput";
import type { DraftAction, FlowTarget, MovableWorkspaceKind, PlanActionInput, RetryRuntimeBindings } from "./unifiedContract";
import { describeFailure } from "./unifiedReasons";

type Notice = { tone: "ok" | "error"; text: string } | null;
type Preparation = { id: string; state: string; reason?: string | null; detail?: string | null; safeLabel?: string; dirty?: boolean | null; capabilities?: string[]; requiredGates?: { id: string; label: string; kind: "command" | "playwright" }[] };
const SETTLED_PREPARATION_STATES = ["ready", "failed", "blocked", "canceled", "expired", "unknown", "succeeded"];
const INCOMPLETE_CHOICE = "Escolha conexão, modelo, raciocínio e checkout em cada ação. Se escolher um worktree, informe um nome ou selecione um válido antes de salvar.";

export function useFlowCommands(target: FlowTarget, onChanged: () => Promise<void>) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [preparations, setPreparations] = useState<Record<string, Preparation>>({});
  const [autoRetry, setAutoRetry] = useState<{ actionId: string; expectedRevision: number; runtimeBindings?: RetryRuntimeBindings } | null>(null);

  async function run(operation: () => Promise<unknown>, success: string) {
    setBusy(true);
    try {
      await operation();
      setNotice({ tone: "ok", text: success });
    } catch (error) {
      setNotice({ tone: "error", text: describeFailure(error).message });
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
    run(() => trpc.taskFlow.startAction.mutate({ ...target, ...input, idempotencyKey: crypto.randomUUID() }), "Ação iniciada.");

  const retryAction = (input: { actionId: string; expectedRevision: number; preparationId?: string; runtimeBindings?: RetryRuntimeBindings }) =>
    run(() => trpc.taskFlow.retryAction.mutate({ ...target, ...input, idempotencyKey: crypto.randomUUID() }), "Nova tentativa iniciada com a escolha confirmada agora.");

  const continueAutoRetry = useEffectEvent((actionId: string, preparation: Preparation) => {
    if (autoRetry?.actionId !== actionId || !SETTLED_PREPARATION_STATES.includes(preparation.state)) return;
    setAutoRetry(null);
    if (preparation.state === "ready") void retryAction({ ...autoRetry, preparationId: preparation.id });
  });

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

  useEffect(() => {
    const pending = Object.entries(preparations).filter(([, value]) => !SETTLED_PREPARATION_STATES.includes(value.state));
    if (pending.length === 0) return;
    let active = true;
    const timer = window.setTimeout(() => {
      for (const [actionId, preparation] of pending) {
        void trpc.taskFlow.localPreparationStatus.query({ ...target, preparationId: preparation.id }).then((result) => {
          if (!active || !result) return;
          setPreparations((current) => ({ ...current, [actionId]: { ...result, id: preparation.id } }));
          continueAutoRetry(actionId, { ...result, id: preparation.id });
        }).catch(() => undefined);
      }
    }, 2000);
    return () => { active = false; window.clearTimeout(timer); };
  }, [preparations, target]);

  const cancelRun = (runId: string) =>
    run(() => trpc.taskFlow.cancelRun.mutate({ ...target, runId, idempotencyKey: crypto.randomUUID() }), "Pedido de cancelamento concluído. Nenhuma outra ação foi iniciada.");

  const approvePackage = (input: { packageId: string; version: number }) =>
    run(() => trpc.taskFlow.approvePackage.mutate({ ...target, ...input, idempotencyKey: crypto.randomUUID() }), "Pacote aprovado. Escolha e inicie a próxima ação no fluxo.");

  return { busy, notice, savePlan, prepareLocalAction, preparations, startAction, retryAction, retryFailedAction, retryPending: autoRetry !== null, cancelRun, approvePackage };
}
