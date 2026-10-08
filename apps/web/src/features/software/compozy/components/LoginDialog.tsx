"use client";

import { Dialog } from "radix-ui";
import { Button } from "@/components/ui/button";
import type { LoginUi } from "../hooks/loginState";

type Props = { state: LoginUi; onConfirm: () => void; onClose: () => void };

const titleFor = (state: LoginUi) => (state.phase === "starting" && state.provider === "claude" ? "Conectar Claude Code" : "Conectar com assinatura");
const EXPIRY_FORMAT = new Intl.DateTimeFormat("pt-BR", { timeStyle: "short" });

function DialogBody({ state, onConfirm }: { state: LoginUi; onConfirm: () => void }) {
  if (state.phase === "starting") return <p role="status">Iniciando a autorização…</p>;
  if (state.phase === "failed") return <p role="alert" className="text-destructive">{state.message}</p>;
  if (state.phase === "connected") return <p role="status">Conta conectada: {state.identityLabel}. A prontidão do runtime é verificada separadamente.</p>;
  if (state.phase === "confirm" || state.phase === "confirming") {
    return (
      <div className="space-y-3">
        <p>Conta autorizada: <strong>{state.identityLabel}</strong></p>
        {state.phase === "confirm" && state.differs && <p role="alert" className="text-github-ink">Esta é uma conta diferente da conectada atualmente. Confirme apenas se a troca é intencional.</p>}
        <Button type="button" onClick={onConfirm} disabled={state.phase === "confirming"}>Confirmar conta</Button>
      </div>
    );
  }
  if (state.phase !== "waiting") return null;
  return (
    <div className="space-y-3">
      <p>Abra o endereço abaixo e entre com a conta da assinatura{state.start.userCode ? " e informe o código" : ""}.</p>
      <p><a href={state.start.verificationUrl} target="_blank" rel="noopener noreferrer" className="underline">{state.start.verificationUrl}</a></p>
      {state.start.userCode && <p className="font-mono text-lg tracking-widest" aria-label="Código de verificação">{state.start.userCode}</p>}
      <p className="text-xs text-ink-3">Expira às {EXPIRY_FORMAT.format(new Date(state.start.expiresAt))}</p>
      <p role="status" className="text-ink-2">Aguardando a autorização no navegador…</p>
    </div>
  );
}

export function LoginDialog({ state, onConfirm, onClose }: Props) {
  return (
    <Dialog.Root open={state.phase !== "idle"} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-ink/40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-line bg-raised p-6 text-[15px]">
          <Dialog.Title className="text-[17px] font-semibold">{titleFor(state)}</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-ink-2">Nenhum token ou chave de API é solicitado neste navegador.</Dialog.Description>
          <div className="mt-4"><DialogBody state={state} onConfirm={onConfirm} /></div>
          <Dialog.Close asChild><Button type="button" variant="outline" className="mt-5">Fechar</Button></Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
