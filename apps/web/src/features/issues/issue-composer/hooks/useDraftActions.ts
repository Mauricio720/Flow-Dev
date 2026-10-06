"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import type { IssueDraft, TaskFailure } from "../contract";
import { createRequestKeys, type RequestKeys } from "../requestKeys";
import { fieldErrorsOf, taskFailure } from "../taskFailure";
import type { ActionContext, TaskCommandBase } from "./actionContext";

export type CommandFailure = { failure: TaskFailure; fieldErrors: Record<string, string> };
export type SaveState = { status: "idle" | "saving" | "saved" } | ({ status: "failed" } & CommandFailure);
export type RefinementDecision = { proposalOperationId: string; decision: "apply" | "discard"; selectedPaths: string[] };
type CommandCall = (base: TaskCommandBase) => Promise<unknown>;
type Command = { fingerprint: string; call: CommandCall };

async function runCommand(context: ActionContext, keys: RequestKeys, command: Command): Promise<CommandFailure | null> {
  const task = context.task;
  if (!task) return null;
  try {
    await command.call({ projectId: context.projectId, taskId: task.id, requestKey: keys.keyFor(`${task.version}:${command.fingerprint}`), expectedVersion: task.version });
    keys.release();
    await context.onChanged();
    return null;
  } catch (error) {
    const failure = taskFailure(error);
    context.onFailure(failure);
    return { failure, fieldErrors: fieldErrorsOf(error) };
  }
}

export function useDraftActions(context: ActionContext) {
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle" });
  const [commandFailure, setCommandFailure] = useState<TaskFailure | null>(null);
  const [busy, setBusy] = useState(false);
  const [keys] = useState(createRequestKeys);
  async function exclusive(fingerprint: string, call: CommandCall) {
    setBusy(true);
    const outcome = await runCommand(context, keys, { fingerprint, call });
    setCommandFailure(outcome?.failure ?? null);
    setBusy(false);
    return outcome === null;
  }
  async function save(draft: IssueDraft, baseRevisionId: string) {
    setSaveState({ status: "saving" });
    const call: CommandCall = (base) => trpc.tasks.saveDraft.mutate({ ...base, baseRevisionId, draft, evidenceBindings: [] });
    const outcome = await runCommand(context, keys, { fingerprint: `save:${baseRevisionId}:${JSON.stringify(draft)}`, call });
    setSaveState(outcome ? { status: "failed", ...outcome } : { status: "saved" });
    return outcome === null;
  }
  const resolveRefinement = (input: RefinementDecision) => exclusive(`resolve:${JSON.stringify(input)}`, (base) => trpc.tasks.resolveRefinement.mutate({ ...base, ...input }));
  const retryGeneration = (failedOperationId: string) => exclusive(`retry:${failedOperationId}`, (base) => trpc.tasks.retryGeneration.mutate({ ...base, failedOperationId }));
  return { saveState, commandFailure, busy, save, resolveRefinement, retryGeneration };
}
