"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import type { SettingsValues } from "../contract";
import { FAILURE_MESSAGES, GENERIC_FAILURE } from "../copy";
import { useAccessGuard } from "./useAccessGuard";

export type SaveNotice = { tone: "ok" | "error"; text: string } | null;
type SaveInput = { values: SettingsValues; expectedRevision: number };
type Callbacks = { onSaved: () => void; onStale: () => void };

const SAVED_TEXT = "Configurações salvas. Salvar não torna conexões ou runtime prontos: confira a prontidão.";

export function useSaveSettings({ onSaved, onStale }: Callbacks) {
  const guard = useAccessGuard();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<SaveNotice>(null);
  const [saving, setSaving] = useState(false);

  async function save(input: SaveInput) {
    setSaving(true);
    setFieldErrors({});
    try {
      await trpc.software.compozy.saveSettings.mutate({ ...input, idempotencyKey: crypto.randomUUID() });
      setNotice({ tone: "ok", text: SAVED_TEXT });
      onSaved();
    } catch (error) {
      const failure = guard(error);
      setFieldErrors(failure.fieldErrors);
      setNotice({ tone: "error", text: FAILURE_MESSAGES[failure.reason ?? ""] ?? GENERIC_FAILURE });
      if (failure.reason === "plan_version_changed") onStale();
    } finally {
      setSaving(false);
    }
  }

  return { save, saving, notice, fieldErrors };
}
