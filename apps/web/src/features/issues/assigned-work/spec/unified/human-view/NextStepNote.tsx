import { itemDomId } from "./humanViewNav";
import type { NextStep } from "./nextStep";
import { APPROVAL_ANCHOR, APPROVAL_LINK, OVERVIEW_TITLES } from "./overviewCopy";

export const NEXT_STEP_ID = "next-step";

export function NextStepNote({ next }: { next: NextStep }) {
  return (
    <section id={itemDomId(NEXT_STEP_ID)} tabIndex={-1} aria-label={OVERVIEW_TITLES.next} className="flex scroll-mt-28 flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg bg-surface px-4 py-3">
      <div className="space-y-0.5">
        <h5 className="text-xs font-medium text-ink-3">{OVERVIEW_TITLES.next}</h5>
        <p className="max-w-[62ch] text-[15px] leading-6 text-ink">{next.text}</p>
      </div>
      {next.toApproval && <a href={`#${APPROVAL_ANCHOR}`} className="rounded-sm text-sm font-medium text-ink underline decoration-line underline-offset-4 hover:decoration-ink">{APPROVAL_LINK}</a>}
    </section>
  );
}
