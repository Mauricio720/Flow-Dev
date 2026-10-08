import { Button } from "@/components/ui/button";
import type { HistoryEntry } from "../contract";
import { EVENT_LABELS } from "../copy";

type Props = { items: HistoryEntry[]; hasMore: boolean; onLoadMore: () => void };

const TIME_FORMAT = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "medium" });

export function AuditPanel({ items, hasMore, onLoadMore }: Props) {
  return (
    <section aria-labelledby="audit-title" className="mt-10">
      <h2 id="audit-title" className="text-xl font-semibold tracking-[-0.02em]">Histórico de alterações</h2>
      {items.length === 0 ? <p className="mt-4 text-sm text-ink-2">Nenhuma alteração registrada ainda.</p> : (
        <ul className="mt-4 divide-y divide-line rounded-xl border border-line bg-raised">
          {items.map((entry) => (
            <li key={entry.id} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3 text-sm">
              <span className="font-medium">{EVENT_LABELS[entry.event] ?? entry.event}</span>
              <span className="text-ink-3">{entry.actorName ?? "Administrador removido"} · {TIME_FORMAT.format(new Date(entry.createdAt))}</span>
            </li>
          ))}
        </ul>
      )}
      {hasMore && <Button type="button" variant="outline" className="mt-4" onClick={onLoadMore}>Carregar mais registros</Button>}
    </section>
  );
}
