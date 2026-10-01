"use client";

import type { RouterOutputs } from "@flow-dev/api";
import { useState } from "react";
import { Button } from "@/components/ui/button";
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
    <div className="rounded-xl border border-line p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-3">Client Component → HTTP /api/trpc</p>
      <Button size="sm" onClick={ping} disabled={pending} className="mt-2">
        {pending ? "Chamando…" : "Chamar health.check"}
      </Button>
      <div className="mt-3 font-mono text-xs text-ink-2">
        {!result && <span>Clique para chamar a API pelo browser.</span>}
        {result && "error" in result && <span className="text-destructive">{result.error}</span>}
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
