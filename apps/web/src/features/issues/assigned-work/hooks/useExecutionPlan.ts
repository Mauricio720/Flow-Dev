"use client";

import { useState } from "react";
import type { EditablePlan } from "../planContract";
import { toEditable } from "../planEditorModel";
import type { TerminalScope } from "../terminalContract";
import { usePlanPersistence } from "./usePlanPersistence";
import { usePlanView } from "./usePlanView";

export function useExecutionPlan(scope: TerminalScope, options: { enabled: boolean }) {
  const { view, failure: loadFailure, read } = usePlanView(scope, options.enabled);
  const [draft, setDraft] = useState<EditablePlan | null>(null);
  const saving = usePlanPersistence({ scope, onSaved: () => setDraft(null), onSettled: read });
  const plan = draft ?? (view ? toEditable(view) : null);
  const edit = (change: (current: EditablePlan) => EditablePlan) => {
    if (plan) setDraft(change(plan));
  };
  const save = async () => {
    if (draft) await saving.persist(draft);
  };
  const adopt = async () => {
    if (view) await saving.persist(draft ?? toEditable(view));
  };
  const discard = () => {
    setDraft(null);
    saving.clearFailure();
    void read();
  };
  return { view, plan, dirty: draft !== null, saving: saving.saving, failure: saving.failure ?? loadFailure, edit, save, adopt, discard, refresh: read };
}

export type ExecutionPlanState = ReturnType<typeof useExecutionPlan>;
