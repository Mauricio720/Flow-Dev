"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Project } from "@/lib/projects/contract";
import { validateDetails, type ProjectDetailsDraft } from "@/lib/projects/detailsValidation";
import { trpc } from "@/lib/trpc/client";
import { useEditorFeedback } from "./useEditorFeedback";

type EditorStatus = "editing" | "saving" | "saved";
type SavedDetails = { name: string; description: string | null };

function draftOf(project: Project): ProjectDetailsDraft {
  return { name: project.name, description: project.description ?? "" };
}

function useSavedDetails(project: Project) {
  const [saved, setSaved] = useState(project);
  const [draft, setDraft] = useState(draftOf(project));
  function confirm(current: Project, keepDraft: boolean) {
    setSaved(current);
    if (!keepDraft) setDraft(draftOf(current));
  }
  return { saved, draft, setDraft, confirm };
}

function useSaveRequest(saved: Project, onSaved: (project: Project) => void, onFailure: (error: unknown) => Promise<void>) {
  const router = useRouter();
  const [status, setStatus] = useState<EditorStatus>("editing");
  async function save(values: SavedDetails) {
    setStatus("saving");
    try {
      onSaved(await trpc.projects.updateDetails.mutate({ projectId: saved.id, ...values, expectedVersion: saved.detailsVersion }));
      setStatus("saved");
      router.refresh();
    } catch (error) {
      setStatus("editing");
      await onFailure(error);
    }
  }
  return { status, save, edit: () => setStatus("editing") };
}

export function useDetailsEditor(project: Project) {
  const details = useSavedDetails(project);
  const feedback = useEditorFeedback(project.id);
  const request = useSaveRequest(details.saved, (updated) => details.confirm(updated, false), feedback.fail);
  function submit() {
    if (request.status === "saving" || feedback.changed) return;
    const valid = validateDetails(details.draft);
    feedback.showFieldErrors(valid.ok ? {} : valid.errors);
    if (valid.ok) void request.save({ name: valid.name, description: valid.description });
  }
  function change(values: ProjectDetailsDraft) {
    details.setDraft(values);
    feedback.showFieldErrors({});
    request.edit();
  }
  function review(keepMine: boolean) {
    if (feedback.changed) details.confirm(feedback.changed, keepMine);
    feedback.finishReview();
  }
  return { draft: details.draft, status: request.status, fieldErrors: feedback.fieldErrors, failure: feedback.failure, changed: feedback.changed, submit, change, review };
}

export type DetailsEditor = ReturnType<typeof useDetailsEditor>;
