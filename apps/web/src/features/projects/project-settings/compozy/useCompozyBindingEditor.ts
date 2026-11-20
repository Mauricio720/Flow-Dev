"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { expiredSessionPath, projectSettingsPath } from "@/lib/navigation/projectRoutes";
import { TRPC_UNAUTHORIZED } from "@/lib/projects/contract";
import { trpc } from "@/lib/trpc/client";
import { trpcCode } from "@/lib/trpc/error";
import { UNREACHABLE, type CompozyBinding } from "./compozyContract";
import { PATH_REQUIRED, bindingFailureCopy } from "./compozyCopy";
import { failureReason, useCompozyBinding } from "./useCompozyBinding";

type EditorStatus = "editing" | "verifying" | "verified";
type EditorFailure = { message: string; conflict: boolean };
type Binding = ReturnType<typeof useCompozyBinding>;

const UNAVAILABLE_REASON = "compozy_unavailable";
const CONFLICT_REASON = "binding_conflict";

function useFailure(projectId: string, binding: Binding) {
  const router = useRouter();
  const [failure, setFailure] = useState<EditorFailure | null>(null);
  function fail(error: unknown) {
    if (trpcCode(error) === TRPC_UNAUTHORIZED) return router.replace(expiredSessionPath(projectSettingsPath(projectId)));
    const reason = failureReason(error);
    if (reason === UNAVAILABLE_REASON) binding.update({ compozy: UNREACHABLE });
    setFailure({ message: bindingFailureCopy(reason), conflict: reason === CONFLICT_REASON });
  }
  return { failure, fail, warn: (message: string) => setFailure({ message, conflict: false }), clear: () => setFailure(null) };
}

function useVerification(binding: Binding, notices: ReturnType<typeof useFailure>, onStored: (stored: CompozyBinding) => void) {
  const [status, setStatus] = useState<EditorStatus>("editing");
  async function run(operation: () => Promise<CompozyBinding>) {
    if (status === "verifying") return;
    notices.clear();
    setStatus("verifying");
    try {
      const stored = await operation();
      binding.update({ binding: stored });
      binding.refreshHealth();
      onStored(stored);
      setStatus("verified");
    } catch (error) {
      setStatus("editing");
      notices.fail(error);
    }
  }
  return { status, run, edit: () => setStatus("editing") };
}

export function useCompozyBindingEditor(projectId: string, binding: Binding, saved: CompozyBinding | null) {
  const [draft, setDraft] = useState(saved?.checkoutPath ?? "");
  const notices = useFailure(projectId, binding);
  const verification = useVerification(binding, notices, (stored) => setDraft(stored.checkoutPath));
  function submit() {
    const checkoutPath = draft.trim();
    if (!checkoutPath) return notices.warn(PATH_REQUIRED);
    void verification.run(() => trpc.projectCompozy.save.mutate({ projectId, checkoutPath, expectedRevision: saved?.revision }));
  }
  function recheck() {
    if (saved) void verification.run(() => trpc.projectCompozy.check.mutate({ projectId, expectedRevision: saved.revision }));
  }
  function change(value: string) {
    setDraft(value);
    verification.edit();
    notices.clear();
  }
  async function reloadAfterConflict() {
    notices.clear();
    await binding.reload();
  }
  return { draft, status: verification.status, failure: notices.failure, submit, recheck, change, reloadAfterConflict };
}

export type CompozyBindingEditorState = ReturnType<typeof useCompozyBindingEditor>;
