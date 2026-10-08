import { RunHistoryRow } from "./RunHistoryRow";
import type { FlowRun } from "./unifiedContract";

type Props = { runs: FlowRun[]; hasMore: boolean; loadingMore: boolean; onLoadMore: () => void };

export function RunHistory({ runs, hasMore, loadingMore, onLoadMore }: Props) {
  if (runs.length === 0 && !hasMore) return <p className="text-sm text-ink-2">Nenhuma execução ainda. Nada foi iniciado.</p>;
  const newestFirst = [...runs].sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
  return (
    <div className="space-y-3">
      <ul aria-label="Execuções do fluxo" className="divide-y divide-line border-y border-line">{newestFirst.map((run) => <RunHistoryRow key={run.id} run={run} />)}</ul>
      {hasMore && <button type="button" className="rounded-sm text-sm text-ink-2 underline decoration-line underline-offset-4 hover:text-ink" disabled={loadingMore} onClick={onLoadMore}>{loadingMore ? "Carregando execuções…" : "Carregar execuções anteriores"}</button>}
    </div>
  );
}
