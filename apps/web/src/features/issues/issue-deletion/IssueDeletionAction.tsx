"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { deletionReasonCopy, deletionStatusCopy, preservedArtifactsCopy, remotePresenceCopy } from "./copy";
import { useDialogFocus } from "./useDialogFocus";
import { useIssueDeletion } from "./useIssueDeletion";
import type { DeletionTarget } from "./types";

type Props = { target: DeletionTarget; returnTo: string; onComplete?: () => void };

export function IssueDeletionAction({ target, returnTo, onComplete }: Props) {
  const router = useRouter();
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const [open, setOpen] = useState(false);
  const completed = () => {
    router.refresh();
    if (onComplete) onComplete();
    else router.replace(returnTo);
  };
  const state = useIssueDeletion(target, completed);
  const close = () => {
    setOpen(false);
    requestAnimationFrame(() => trigger.current?.focus());
  };
  useDialogFocus(open, state.busy, close, { trigger, dialog, heading });
  if (state.loading || !state.preview?.canDelete) return null;
  const preview = state.preview;
  return (
    <>
      <Button ref={trigger} type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>Excluir issue</Button>
      {open && <dialog ref={dialog} open aria-modal="true" aria-labelledby="deletion-title" className="fixed inset-0 z-50 m-0 flex min-h-full w-full max-w-none items-center justify-center border-0 bg-black/40 p-3 backdrop:bg-black/40 sm:p-6">
        <section className="w-full max-w-lg space-y-5 rounded-xl border border-line bg-raised p-5 text-ink shadow-raised sm:p-6">
          <header className="space-y-2">
            <h2 id="deletion-title" ref={heading} tabIndex={-1} className="text-lg font-semibold">Excluir issue permanentemente?</h2>
            <p className="text-sm font-medium [overflow-wrap:anywhere]">{preview.title || "Issue sem título"}</p>
            <p className="font-mono text-xs text-ink-3">{preview.repository}{preview.issueNumber ? ` #${preview.issueNumber}` : ""}</p>
          </header>
          <DeletionExplanation destinations={preview.destinations} />
          <p className="text-sm leading-relaxed text-ink-2">{preservedArtifactsCopy()}</p>
          <DeletionProgress status={state.status} failure={state.failure} />
          <DeletionControls state={state} onClose={close} />
        </section>
      </dialog>}
    </>
  );
}

function DeletionExplanation({ destinations }: { destinations: string[] }) {
  const github = destinations.includes("github");
  return <p className="text-sm leading-relaxed text-ink-2">A exclusão é permanente e interrompe o trabalho ativo. O histórico do Flow Dev será removido{github ? " e a issue também será excluída do GitHub" : ""}.</p>;
}

function DeletionProgress({ status, failure }: { status: ReturnType<typeof useIssueDeletion>["status"]; failure: string | null }) {
  if (failure) return <p role="alert" className="border-t border-line pt-3 text-sm text-ink-2">{failure}</p>;
  if (!status) return null;
  const reason = deletionReasonCopy(status.reason);
  return <div role="status" aria-live="polite" className="space-y-2 border-t border-line pt-3 text-sm text-ink-2">
    <p>{deletionStatusCopy(status.state)}</p>
    <p>Trabalho ativo: {status.workStopped ? "interrompido" : "ainda não confirmado como interrompido"}.</p>
    {status.remotePresence !== "not_applicable" && <p>GitHub: {remotePresenceCopy(status.remotePresence)}.</p>}
    {reason && <p>{reason}</p>}
    {status.retryAfterSeconds !== null && status.retryAfterSeconds > 0 && <p>Tente novamente em {status.retryAfterSeconds} s.</p>}
  </div>;
}

function DeletionControls({ state, onClose }: { state: ReturnType<typeof useIssueDeletion>; onClose: () => void }) {
  const recoverable = state.status?.state === "recoverable";
  const hasOperation = state.status !== null;
  return <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
    {!state.busy && <Button type="button" variant="outline" onClick={onClose}>{hasOperation ? "Fechar" : "Cancelar"}</Button>}
    {recoverable && <Button type="button" variant="outline" disabled={state.busy} onClick={() => void state.retry()}>Tentar novamente</Button>}
    {hasOperation && !recoverable && state.status?.state !== "completed" && !state.busy && <Button type="button" variant="outline" onClick={() => void state.refreshStatus()}>Atualizar estado</Button>}
    {!hasOperation && <Button type="button" variant="destructive" disabled={state.busy} onClick={() => void state.start()}>{state.busy ? "Iniciando…" : "Excluir permanentemente"}</Button>}
  </div>;
}
