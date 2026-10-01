"use client";

import type { RouterOutputs } from "@flow-dev/api";
import { useState } from "react";
import { trpc } from "@/lib/trpc/client";

type Result = { health: RouterOutputs["health"]["check"]; latencyMs: number } | { error: string };

export function HttpPing() {
  const [result, setResult] = useState<Result | null>(null);
  const [pending, setPending] = useState(false);

  async function ping() {
    setPending(true);
    const startedAt = performance.now();
    try {
      const health = await trpc.health.check.query();
      setResult({ health, latencyMs: Math.round(performance.now() - startedAt) });
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : "Falha na requisição" });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-xl border border-foreground/10 p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-foreground/50">Client Component → HTTP /api/trpc</p>
      <button
        onClick={ping}
        disabled={pending}
        className="mt-2 rounded-lg bg-foreground px-3 py-1.5 text-sm font-medium text-background disabled:opacity-50"
      >
        {pending ? "Chamando…" : "Chamar health.check"}
      </button>
      <div className="mt-3 font-mono text-xs text-foreground/60">
        {!result && <span>Clique para chamar a API pelo browser.</span>}
        {result && "error" in result && <span className="text-red-500">{result.error}</span>}
        {result && "health" in result && (
          <dl className="space-y-1">
            <div>status: {result.health.status} · {result.latencyMs} ms</div>
            <div>requestId: {result.health.requestId.slice(0, 8)}</div>
          </dl>
        )}
      </div>
    </div>
  );
}
