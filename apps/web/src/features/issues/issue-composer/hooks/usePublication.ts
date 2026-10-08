"use client";

import { useState } from "react";
import type { TaskFailure } from "../contract";
import { PreviewContractError, loadPublicationPreview, requestPublication, type PublicationPreview } from "../publicationClient";
import { createRequestKeys, type RequestKeys } from "@/lib/tasks/requestKeys";
import { taskFailure } from "@/lib/tasks/taskFailure";
import type { ActionContext } from "./actionContext";

export type PreviewState = { status: "idle" | "loading" } | { status: "ready"; preview: PublicationPreview } | { status: "failed"; failure: TaskFailure };
type PublicationContext = ActionContext & { repositoryId: string | null };

export const PUBLICATION_UNAVAILABLE_REASON = "publication_unavailable";

function publicationFailure(error: unknown): TaskFailure {
  const failure = taskFailure(error);
  const unspecified = error instanceof PreviewContractError || (failure.code !== null && failure.reason === null);
  return unspecified ? { code: failure.code, reason: PUBLICATION_UNAVAILABLE_REASON } : failure;
}

async function approve(context: PublicationContext, keys: RequestKeys, preview: PublicationPreview) {
  const task = context.task;
  if (!task || !context.repositoryId) return;
  const requestKey = keys.keyFor(`${task.version}:${preview.previewHash}`);
  await requestPublication({ projectId: context.projectId, taskId: task.id, revisionId: preview.revisionId, previewHash: preview.previewHash, repositoryId: context.repositoryId, expectedVersion: task.version, requestKey });
  keys.release();
  await context.onChanged();
}

export function usePublication(context: PublicationContext) {
  const [state, setState] = useState<PreviewState>({ status: "idle" });
  const [approving, setApproving] = useState(false);
  const [keys] = useState(createRequestKeys);
  function fail(error: unknown) {
    const failure = publicationFailure(error);
    context.onFailure(failure);
    setState({ status: "failed", failure });
  }
  async function review(revisionId: string) {
    if (!context.task) return;
    setState({ status: "loading" });
    try {
      setState({ status: "ready", preview: await loadPublicationPreview({ projectId: context.projectId, taskId: context.task.id, revisionId }) });
    } catch (error) {
      fail(error);
    }
  }
  async function publish() {
    if (state.status !== "ready" || approving) return;
    setApproving(true);
    await approve(context, keys, state.preview).catch(fail);
    setApproving(false);
  }
  const previewFor = (revisionId: string) => (state.status === "ready" && state.preview.revisionId === revisionId ? state.preview : null);
  return { state, approving, review, publish, previewFor };
}

export type Publication = ReturnType<typeof usePublication>;
