"use client";

import { useState } from "react";
import type { SpecSnapshot } from "./specContract";
import { STATE_LABEL } from "./specStageModel";

function message(snapshot: SpecSnapshot) {
  const state = STATE_LABEL[snapshot.state] ?? "Estado desconhecido";
  const pending = snapshot.pendingInteractions.length;
  return pending > 0 ? `${state}. Há ${pending} ação pendente para você.` : `Especificação: ${state}.`;
}

export function useSpecAnnouncement(snapshot: SpecSnapshot | null) {
  const key = snapshot ? `${snapshot.state}:${snapshot.pendingInteractions.length}` : null;
  const [seen, setSeen] = useState<{ key: string | null; text: string }>({ key, text: "" });
  if (seen.key !== key) setSeen({ key, text: snapshot ? message(snapshot) : "" });
  return seen.text;
}
