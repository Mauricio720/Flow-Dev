"use client";

import { CapabilityList } from "./CapabilityList";
import { ExpandableItems, ItemGroupSection, ItemList } from "./OverviewItems";
import { FILES_LINK, filesLabel, OVERVIEW_EMPTY, OVERVIEW_TITLES } from "./overviewCopy";
import type { OpenSource, SpecOverview } from "./overviewTypes";
import { InlineText, OverviewHeading, SourceLink } from "./OverviewText";

type Props = { overview: SpecOverview; onOpenSource: OpenSource; onOpenDocument: (path: string) => void };
const IMPACT_LIMIT = 6;
const SECTION = "space-y-3 border-t border-line pt-6";

function Delivery({ overview, onOpenSource, onOpenDocument }: Props) {
  const { what, why, capabilities } = overview;
  return (
    <section aria-label={OVERVIEW_TITLES.delivery} className="space-y-4">
      <div className="space-y-2">
        <OverviewHeading title={OVERVIEW_TITLES.delivery} />
        {what ? <p className="max-w-[65ch] text-base leading-7 text-ink"><InlineText text={what.text} onOpenDocument={onOpenDocument} /></p> : <p className="text-sm text-ink-3">{OVERVIEW_EMPTY.delivery}</p>}
        {why && <p className="max-w-[65ch] text-[15px] leading-7 text-ink-2"><span className="font-medium text-ink">{OVERVIEW_TITLES.why}: </span><InlineText text={why.text} onOpenDocument={onOpenDocument} /></p>}
        {(what ?? why) && <SourceLink source={(what ?? why)!.source} onOpen={onOpenSource} />}
      </div>
      <div className="space-y-2">
        <h6 className="text-xs font-medium text-ink-3">{OVERVIEW_TITLES.capabilities}</h6>
        {capabilities.length > 0 ? <CapabilityList capabilities={capabilities} onOpenSource={onOpenSource} /> : <p className="text-sm text-ink-3">{OVERVIEW_EMPTY.capabilities}</p>}
      </div>
    </section>
  );
}

function Questions({ overview, onOpenSource, onOpenDocument }: Props) {
  const { questions, openNote } = overview;
  return (
    <section aria-label={OVERVIEW_TITLES.questions} className={SECTION}>
      <OverviewHeading title={OVERVIEW_TITLES.questions} count={questions.length} />
      {questions.length > 0 ? <ItemList items={questions} onOpenSource={onOpenSource} onOpenDocument={onOpenDocument} /> : <p className="text-sm text-ink-3">{OVERVIEW_EMPTY.questions}</p>}
      {openNote && <div className="space-y-1"><p className="max-w-[65ch] text-sm leading-6 text-ink-2"><InlineText text={openNote.text} onOpenDocument={onOpenDocument} /></p><SourceLink source={openNote.source} onOpen={onOpenSource} /></div>}
    </section>
  );
}

function Impacts({ overview, onOpenSource, onOpenDocument }: Props) {
  const { impacts, files } = overview;
  return (
    <section aria-label={OVERVIEW_TITLES.impacts} className={SECTION}>
      <OverviewHeading title={OVERVIEW_TITLES.impacts} count={impacts.length} />
      {impacts.length > 0 ? <ExpandableItems items={impacts} limit={IMPACT_LIMIT} mono onOpenSource={onOpenSource} onOpenDocument={onOpenDocument} /> : <p className="text-sm text-ink-3">{OVERVIEW_EMPTY.impacts}</p>}
      {files && <p className="text-sm text-ink-2">{filesLabel(files.count)}. <button type="button" onClick={() => onOpenSource(files.source)} className="rounded-sm text-ink underline decoration-line underline-offset-4 hover:decoration-ink">{FILES_LINK}</button></p>}
    </section>
  );
}

export function SpecOverviewView(props: Props) {
  const { overview, onOpenSource, onOpenDocument } = props;
  const handlers = { onOpenSource, onOpenDocument };
  return (
    <div className="space-y-6">
      <Delivery {...props} />
      <div className="grid gap-x-8 gap-y-6 border-t border-line pt-6 lg:grid-cols-2">
        <ItemGroupSection title={OVERVIEW_TITLES.decisions} group={overview.decisions} empty={OVERVIEW_EMPTY.decisions} {...handlers} />
        <ItemGroupSection title={OVERVIEW_TITLES.risks} group={overview.risks} empty={OVERVIEW_EMPTY.risks} {...handlers} />
      </div>
      <Questions {...props} />
      <Impacts {...props} />
    </div>
  );
}
