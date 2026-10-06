"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useSyncExternalStore } from "react";
import { PROJECT_CREATED_PATH } from "@/lib/navigation/projectRoutes";
import { validateDetails, type ProjectDetailsDraft } from "@/lib/projects/detailsValidation";
import { trpc } from "@/lib/trpc/client";
import { creationDraftStore } from "../creationDraft";
import { useCreationFeedback } from "./useCreationFeedback";

type CreationDetails = { name: string; description: string | null };

function useCreationRequest(onFailure: (error: unknown) => void) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const inFlight = useRef(false);
  async function create(nodeId: string, details: CreationDetails) {
    if (inFlight.current) return;
    inFlight.current = true;
    setSubmitting(true);
    try {
      await trpc.projects.create.mutate({ ...details, nodeId });
      creationDraftStore.clear();
      router.push(PROJECT_CREATED_PATH);
    } catch (error) {
      onFailure(error);
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }
  return { submitting, create };
}

export function useProjectCreation() {
  const draft = useSyncExternalStore(creationDraftStore.subscribe, creationDraftStore.read, creationDraftStore.empty);
  const feedback = useCreationFeedback();
  const request = useCreationRequest(feedback.fail);
  function submit(nodeId: string) {
    if (request.submitting) return;
    const details = validateDetails(draft);
    feedback.showFieldErrors(details.ok ? {} : details.errors);
    if (details.ok) void request.create(nodeId, { name: details.name, description: details.description });
  }
  function change(values: ProjectDetailsDraft) {
    creationDraftStore.write(values);
    feedback.showFieldErrors({});
  }
  return { draft, fieldErrors: feedback.fieldErrors, failure: feedback.failure, submitting: request.submitting, submit, change };
}

export type ProjectCreationForm = ReturnType<typeof useProjectCreation>;
