"use client";

import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import type { SoftwareSettings } from "../contract";
import { useSaveSettings } from "../hooks/useSaveSettings";
import { useSettingsDraft } from "../hooks/useSettingsDraft";
import { SettingsFields } from "./SettingsFields";

type Props = { settings: SoftwareSettings; onSaved: () => void; onStale: () => void };

export function SettingsForm({ settings, onSaved, onStale }: Props) {
  const { draft, change } = useSettingsDraft(settings);
  const { save, saving, notice, fieldErrors } = useSaveSettings({ onSaved, onStale });

  function submit(event: FormEvent) {
    event.preventDefault();
    const values = { enabled: draft.enabled, docsProxyUrl: draft.docsProxyUrl || null, maxActiveActions: draft.maxActiveActions };
    void save({ values, expectedRevision: settings.revision });
  }

  return (
    <form onSubmit={submit} aria-labelledby="settings-title" className="mt-4 space-y-4 rounded-xl border border-line bg-raised p-4">
      <SettingsFields draft={draft} fieldErrors={fieldErrors} onChange={change} />
      {notice && <p role={notice.tone === "error" ? "alert" : "status"} className={notice.tone === "error" ? "text-sm text-destructive" : "text-sm text-ink-2"}>{notice.text}</p>}
      <Button type="submit" disabled={saving}>{saving ? "Salvando…" : "Salvar configurações"}</Button>
    </form>
  );
}
