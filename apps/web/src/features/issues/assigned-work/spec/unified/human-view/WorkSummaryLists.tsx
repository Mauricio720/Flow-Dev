import type { ViewTarget } from "./humanViewNav";
import type { OverviewItem } from "./overviewTypes";
import { InlineText } from "./OverviewText";
import type { ArtifactView } from "./viewTypes";
import { LIST_LIMIT, NOT_SPECIFIED_SHORT, requirementMeta, SEE_ALL, WORK_SUMMARY_LISTS } from "./workSummaryCopy";

type Entry = { id: string; title: string; code?: string; meta?: string };
type ColumnProps = { title: string; entries: Entry[]; section: string; onOpen: (target: ViewTarget) => void };
const ROW = "w-full rounded-sm py-2 text-left hover:bg-ink/[0.03]";

function Column({ title, entries, section, onOpen }: ColumnProps) {
  return (
    <section aria-label={title} className="min-w-0 space-y-1 px-5 py-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold text-ink">{title}<span className="ml-2 font-normal text-ink-3 tabular-nums">{entries.length}</span></h3>
        {entries.length > LIST_LIMIT && <button type="button" onClick={() => onOpen({ mode: "product", section })} className="shrink-0 rounded-sm text-xs text-ink-2 underline decoration-line underline-offset-4 hover:text-ink">{SEE_ALL}</button>}
      </div>
      {entries.length === 0 && <p className="text-sm text-ink-3">{NOT_SPECIFIED_SHORT}</p>}
      <ul className="divide-y divide-line">
        {entries.slice(0, LIST_LIMIT).map((entry) => (
          <li key={entry.id}>
            <button type="button" onClick={() => onOpen({ mode: "product", section, itemId: entry.id })} className={ROW}>
              {entry.code && <span className="block font-mono text-xs text-ink-3">{entry.code}</span>}
              <span className="block text-sm leading-6 text-ink"><InlineText text={entry.title} /></span>
              {entry.meta && <span className="block text-xs text-ink-3">{entry.meta}</span>}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function WorkSummaryLists({ view, onOpen }: { view: ArtifactView; onOpen: (target: ViewTarget) => void }) {
  const { requirements, decisions, risks } = view.product;
  const capabilities = requirements.map((item) => ({ id: item.code, code: item.code, title: item.title, meta: requirementMeta(item.acceptance.length, item.tests.length) }));
  const plain = (items: OverviewItem[]): Entry[] => items.map((item) => ({ id: item.id, title: item.title }));
  return (
    <div className="grid divide-line border-t border-line max-lg:divide-y lg:grid-cols-3 lg:divide-x">
      <Column title={WORK_SUMMARY_LISTS.capabilities} entries={capabilities} section="requirements" onOpen={onOpen} />
      <Column title={WORK_SUMMARY_LISTS.decisions} entries={plain(decisions)} section="decisions" onOpen={onOpen} />
      <Column title={WORK_SUMMARY_LISTS.risks} entries={plain(risks)} section="risks" onOpen={onOpen} />
    </div>
  );
}
