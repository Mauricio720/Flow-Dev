"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";
import type { FlowTarget } from "./unifiedContract";

type Props = { target: FlowTarget };
const POLL_MS = 1500;
const WAIT_MS = 70_000;

function failureCopy(reason: string | null) {
  if (reason === "path_invalid" || reason === "repository_mismatch") return "A pasta local não pôde ser validada. Confira o vínculo do projeto e tente novamente.";
  if (reason === "runtime_failed") return "O VS Code não abriu. Confira se o comando code funciona na máquina vinculada.";
  return "Não foi possível abrir. Confira se o conector está ativo e tente novamente.";
}

export function OpenLocalWorktree({ target }: Props) {
  const [commandId, setCommandId] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "waiting" | "opened" | "failed">("idle");
  const [reason, setReason] = useState<string | null>(null);
  const { projectId, taskId } = target;

  useEffect(() => {
    if (!commandId) return;
    let active = true;
    const started = Date.now();
    const timer = window.setInterval(async () => {
      if (Date.now() - started > WAIT_MS) { setState("failed"); window.clearInterval(timer); return; }
      try {
        const result = await trpc.taskFlow.openLocalWorktreeStatus.query({ projectId, taskId, commandId });
        if (!active || !result) return;
        if (result.state === "succeeded") { setState("opened"); window.clearInterval(timer); }
        if (["failed", "blocked", "expired", "unknown"].includes(result.state)) { setReason(result.reason); setState("failed"); window.clearInterval(timer); }
      } catch {
        if (active) { setState("failed"); window.clearInterval(timer); }
      }
    }, POLL_MS);
    return () => { active = false; window.clearInterval(timer); };
  }, [projectId, taskId, commandId]);

  async function open() {
    setState("waiting");
    setReason(null);
    setCommandId(null);
    try {
      const result = await trpc.taskFlow.openLocalWorktree.mutate({ projectId, taskId, requestKey: crypto.randomUUID() });
      setCommandId(result.commandId);
    } catch { setState("failed"); }
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-line bg-surface px-4 py-3">
      <Button type="button" variant="secondary" disabled={state === "waiting"} onClick={() => void open()}>
        {state === "waiting" ? "Abrindo worktree…" : "Abrir worktree no VS Code"}
      </Button>
      <p className="text-xs leading-5 text-ink-2">Pasta local da Issue. Na criação, recebe os arquivos .env do projeto vinculado.</p>
      {state === "opened" && <p role="status" className="w-full text-sm text-ink-2">Comando enviado ao VS Code da máquina vinculada.</p>}
      {state === "failed" && <p role="alert" className="w-full text-sm text-destructive">{failureCopy(reason)}</p>}
    </div>
  );
}
