"use client";

import { useState } from "react";
import type { TaskDetail, TaskRevision } from "../contract";
import { publicationErrors, serverDraftErrors, type DraftErrors, type DraftPath } from "../draftModel";
import { draftSources } from "../draftSources";
import { publishBlock } from "../reviewGate";
import type { ActionContext } from "./actionContext";
import type { SaveState } from "./useDraftActions";
import { useDraftEditor } from "./useDraftEditor";
import { usePublication } from "./usePublication";
import type { TaskActions } from "./useTaskActions";

export type ReviewInput = { detail: TaskDetail; revision: TaskRevision; actions: TaskActions; context: ActionContext; repositoryId: string | null; capturing: boolean; locked: boolean };

const VIEW_ONLY_STATUSES = ["generating", "publishing"];

function reviewErrors(saveState: SaveState, validation: DraftErrors): DraftErrors {
  return { ...serverDraftErrors(saveState.status === "failed" ? saveState.fieldErrors : {}), ...validation };
}

export function useDraftReview({ detail, revision, actions, context, repositoryId, capturing, locked }: ReviewInput) {
  const editor = useDraftEditor(revision);
  const publication = usePublication({ ...context, repositoryId });
  const [attempted, setAttempted] = useState(false);
  const preview = publication.previewFor(revision.id);
  const proposal = detail.pendingProposal;
  const { status } = detail.task;
  const block = publishBlock({ locked, status, dirty: editor.dirty, saving: actions.saveState.status === "saving", stale: editor.stale, proposalPending: proposal !== null, capturing, previewReady: preview !== null });
  async function save() {
    const saved = editor.draft;
    if (await actions.save(saved, editor.baseRevisionId)) editor.discardSaved(saved);
  }
  function review() {
    setAttempted(true);
    if (Object.keys(publicationErrors(editor.draft)).length === 0) void publication.review(revision.id);
  }
  const resolve = (decision: "apply" | "discard", selectedPaths: DraftPath[]) => proposal && void actions.resolveRefinement({ proposalOperationId: proposal.operationId, decision, selectedPaths });
  return {
    editor: VIEW_ONLY_STATUSES.includes(status) ? null : editor,
    draft: editor.draft,
    publication,
    preview,
    proposal,
    block,
    errors: reviewErrors(actions.saveState, attempted ? publicationErrors(editor.draft) : {}),
    sources: draftSources(editor.dirty ? { draft: editor.draft, evidenceBindings: [] } : revision),
    actions: { save, review, resolve },
  };
}
