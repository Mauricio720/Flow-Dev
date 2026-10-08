"use client";

import { useState } from "react";
import type { SoftwareSettings } from "../contract";

function draftFrom(settings: SoftwareSettings) {
  const { enabled, docsProxyUrl, maxActiveActions } = settings.settings;
  return { enabled, docsProxyUrl: docsProxyUrl ?? "", maxActiveActions };
}

export function useSettingsDraft(settings: SoftwareSettings) {
  const [seenRevision, setSeenRevision] = useState(settings.revision);
  const [draft, setDraft] = useState(() => draftFrom(settings));
  if (seenRevision !== settings.revision) {
    setSeenRevision(settings.revision);
    setDraft(draftFrom(settings));
  }
  const change = (patch: Partial<typeof draft>) => setDraft((current) => ({ ...current, ...patch }));
  return { draft, change };
}
