"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";
import { trpcData } from "@/lib/trpc/error";

type Preview = { label: string; expiresAt: string };
type State = { kind: "loading" } | { kind: "ready"; preview: Preview } | { kind: "confirmed"; label: string } | { kind: "failed"; message: string };

const FAILURE_COPY: Record<string, string> = {
  pairing_expired: "Este código expirou. Gere um novo pelo conector local.",
  pairing_consumed: "Este código já foi usado. Gere um novo pelo conector local.",
  pairing_not_found: "Não encontramos este pareamento. Confira o código no terminal.",
};

function safeFailure(error: unknown) {
  const data = trpcData(error);
  const reason = data && "reason" in data && typeof data.reason === "string" ? data.reason : "";
  return FAILURE_COPY[reason] ?? "Não foi possível conferir o código. Tente novamente.";
}

export function LocalMachinePairing({ code }: { code: string }) {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [busy, setBusy] = useState(false);
  const requestKey = useRef<string | null>(null);

  useEffect(() => {
    let current = true;
    void trpc.localMachines.pairingPreview.query({ code }).then((preview) => {
      if (current) setState({ kind: "ready", preview });
    }).catch((error: unknown) => {
      if (current) setState({ kind: "failed", message: safeFailure(error) });
    });
    return () => { current = false; };
  }, [code]);

  async function confirm() {
    if (state.kind !== "ready" || busy) return;
    requestKey.current ??= crypto.randomUUID();
    setBusy(true);
    try {
      await trpc.localMachines.confirmPairing.mutate({ code, requestKey: requestKey.current });
      setState({ kind: "confirmed", label: state.preview.label });
    } catch (error) {
      setState({ kind: "failed", message: safeFailure(error) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-dvh bg-ground px-4 py-10 text-ink sm:px-8">
      <div className="mx-auto w-full max-w-xl">
        <Link href="/projects" className="text-sm font-medium text-ink-3 underline-offset-4 hover:text-ink hover:underline">Flow Dev</Link>
        <h1 className="mt-8 text-3xl font-semibold tracking-[-0.03em]">Conectar máquina local</h1>
        <p className="mt-3 max-w-[65ch] text-[15px] leading-7 text-ink-2">Confira o nome da máquina antes de permitir que ela se conecte à sua conta. A confirmação só libera esta máquina; ela não inicia nenhuma ação.</p>

        {state.kind === "loading" && <p role="status" className="mt-8 text-sm text-ink-3">Conferindo o código…</p>}
        {state.kind === "failed" && <p role="alert" className="mt-8 rounded-lg border border-github/40 bg-github-wash px-4 py-3 text-sm leading-6 text-github-ink">{state.message}</p>}
        {state.kind === "ready" && (
          <section aria-label="Detalhes da máquina" className="mt-8 space-y-5 border-y border-line py-5">
            <dl className="grid gap-1 sm:grid-cols-[130px_1fr]">
              <dt className="text-sm text-ink-3">Máquina</dt>
              <dd className="font-medium [overflow-wrap:anywhere]">{state.preview.label}</dd>
              <dt className="text-sm text-ink-3">Código válido até</dt>
              <dd className="text-sm tabular-nums">{new Date(state.preview.expiresAt).toLocaleString("pt-BR")}</dd>
            </dl>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" disabled={busy} onClick={() => void confirm()}>{busy ? "Conectando…" : "Confirmar conexão"}</Button>
              <Link href="/projects" className="px-2 py-2 text-sm text-ink-3 underline-offset-4 hover:text-ink hover:underline">Cancelar</Link>
            </div>
          </section>
        )}
        {state.kind === "confirmed" && (
          <section role="status" className="mt-8 border-y border-line py-5">
            <h2 className="text-lg font-semibold">Conexão confirmada</h2>
            <p className="mt-2 text-sm leading-6 text-ink-2">{state.label} pode concluir o pareamento no terminal. Você pode fechar esta página.</p>
          </section>
        )}
      </div>
    </main>
  );
}
