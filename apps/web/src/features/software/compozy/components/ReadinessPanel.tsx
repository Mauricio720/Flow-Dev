import { Button } from "@/components/ui/button";
import { LAYER_TITLES, REASON_ACTIONS } from "../copy";
import type { ReadinessLayer } from "../contract";
import type { ReadinessState } from "../hooks/useReadiness";
import { StateText } from "./StateText";

const CHECK_TIME = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "medium" });
const READY_NEXT_ACTION = "Nenhuma ação necessária.";

type Props = { state: ReadinessState; onRefresh: () => void };

function LayerCard({ layer, checkedAt, stale }: { layer: ReadinessLayer; checkedAt: string; stale: boolean }) {
  const title = LAYER_TITLES[layer.layer] ?? layer.layer;
  const action = layer.reasonCode ? REASON_ACTIONS[layer.reasonCode] ?? "Atualize a verificação." : READY_NEXT_ACTION;
  return (
    <li className="rounded-xl border border-line bg-raised p-4">
      <h3 className="text-[15px] font-semibold">{title}</h3>
      <div className="mt-2"><StateText state={layer.state} /></div>
      <p className="mt-2 text-sm leading-6 text-ink-2">{action}</p>
      <p className="mt-2 text-xs text-ink-3">Verificado em {checkedAt}{stale ? " (desatualizado)" : ""}</p>
    </li>
  );
}

function Layers({ state }: { state: Extract<ReadinessState, { status: "loaded" }> }) {
  const { readiness } = state;
  const checkedAt = CHECK_TIME.format(new Date(readiness.checkedAt));
  return (
    <ul className="mt-4 grid gap-3 sm:grid-cols-2">
      {readiness.layers.map((layer) => <LayerCard key={layer.layer} layer={layer} checkedAt={checkedAt} stale={readiness.stale} />)}
    </ul>
  );
}

export function ReadinessPanel({ state, onRefresh }: Props) {
  return (
    <section aria-labelledby="readiness-title" className="mt-10">
      <div className="flex items-center justify-between gap-3">
        <h2 id="readiness-title" className="text-xl font-semibold tracking-[-0.02em]">Prontidão</h2>
        <Button type="button" variant="outline" size="sm" onClick={onRefresh} disabled={state.status === "checking"}>Atualizar verificações</Button>
      </div>
      {state.status === "checking" && <p role="status" className="mt-4 text-sm text-ink-2">Verificando aplicativo, conexões, runtime e host…</p>}
      {state.status === "failed" && <p role="alert" className="mt-4 text-sm text-destructive">Não foi possível verificar a prontidão. Nenhuma execução é liberada até uma nova verificação.</p>}
      {state.status === "loaded" && <Layers state={state} />}
    </section>
  );
}
