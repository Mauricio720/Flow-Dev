"use client";

import { Button } from "@/components/ui/button";
import { reasonMessage } from "../taskCopy";
import type { SpecCommandHook } from "./useSpecCommand";
import { AWAITING_APPLICATION, CONFLICT_COMMAND, UNCERTAIN_COMMAND } from "./specCopy";

export function SpecCommandNotice({ hook }: { hook: SpecCommandHook }) {
  const { phase, failure } = hook.command;
  if (phase === "awaiting") return <p role="status" className="text-sm text-ink-2">{AWAITING_APPLICATION}</p>;
  if (phase === "conflict") return <div role="alert" className="space-y-2"><p className="text-sm text-destructive">{CONFLICT_COMMAND}</p><Button type="button" variant="outline" size="sm" onClick={hook.reset}>Revisar a versão atual</Button></div>;
  if (phase === "uncertain" || phase === "resend") return <div role="status" className="space-y-2"><p className="text-sm text-ink-2">{UNCERTAIN_COMMAND}</p><Button type="button" variant="outline" size="sm" onClick={phase === "resend" ? hook.resend : () => void hook.reconcile()}>{phase === "resend" ? "Reenviar a mesma ação" : "Verificar envio"}</Button></div>;
  if (phase === "rejected" && failure) return <p role="alert" className="text-sm text-destructive">{reasonMessage(failure.reason)}</p>;
  return null;
}
