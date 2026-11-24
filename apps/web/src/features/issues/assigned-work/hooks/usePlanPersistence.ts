"use client";

import { useState } from "react";
import { trpcData } from "@/lib/trpc/error";
import { savePlan } from "../planClient";
import type { EditablePlan } from "../planContract";
import { PLAN_SAVE_FAILED } from "../planCopy";
import { toSaveInput } from "../planEditorModel";
import type { TerminalScope } from "../terminalContract";

type Input = { scope: TerminalScope; onSaved: () => void; onSettled: () => Promise<void> };

function saveMessage(error: unknown) {
  const data = trpcData(error);
  return error instanceof Error && data && "reason" in data ? error.message : PLAN_SAVE_FAILED;
}

export function usePlanPersistence({ scope, onSaved, onSettled }: Input) {
  const [failure, setFailure] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  async function persist(source: EditablePlan) {
    setSaving(true);
    setFailure(null);
    try {
      await savePlan({ projectId: scope.projectId, taskId: scope.taskId }, toSaveInput(source));
      onSaved();
    } catch (error) {
      setFailure(saveMessage(error));
    } finally {
      setSaving(false);
      await onSettled();
    }
  }
  return { failure, saving, persist, clearFailure: () => setFailure(null) };
}
