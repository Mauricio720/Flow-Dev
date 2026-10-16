"use client";

import { useState } from "react";
import { itemDomId } from "./humanViewNav";
import { DETAIL_LABEL, moreLabel } from "./overviewCopy";
import type { ItemGroup, OpenSource, OverviewItem } from "./overviewTypes";
import { BlockText, InlineText, OverviewHeading, SourceLink } from "./OverviewText";

type Handlers = { onOpenSource: OpenSource; onOpenDocument: (path: string) => void };
type ItemProps = Handlers & { item: OverviewItem; mono?: boolean };
type ListProps = Handlers & { items: OverviewItem[]; mono?: boolean };
type GroupProps = Handlers & { title: string; group: ItemGroup; empty: string };
const TOGGLE = "rounded-sm text-sm font-medium text-ink underline decoration-line underline-offset-4 hover:decoration-ink";

export function ItemRow({ item, mono = false, onOpenSource, onOpenDocument }: ItemProps) {
  return (
    <li id={itemDomId(item.id)} tabIndex={-1} className="scroll-mt-28 space-y-1 py-3 first:pt-0 last:pb-0">
      <p className={mono ? "text-sm leading-6 text-ink [&_code]:text-[13px]" : "text-[15px] leading-6 text-ink"}><InlineText text={item.title} onOpenDocument={onOpenDocument} /></p>
      {item.meta.length > 0 && <p className="text-xs text-ink-3">{item.meta.join(" · ")}</p>}
      {item.detail.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-sm text-ink-2 marker:text-ink-3 hover:text-ink">{DETAIL_LABEL}</summary>
          <div className="mt-2 space-y-2 [&_p]:text-sm [&_p]:leading-6">{item.detail.map((text, index) => <BlockText key={index} text={text} onOpenDocument={onOpenDocument} />)}</div>
        </details>
      )}
      <SourceLink source={item.source} onOpen={onOpenSource} />
    </li>
  );
}

export function ItemList({ items, mono, onOpenSource, onOpenDocument }: ListProps) {
  return <ul className="divide-y divide-line">{items.map((item) => <ItemRow key={item.id} item={item} mono={mono} onOpenSource={onOpenSource} onOpenDocument={onOpenDocument} />)}</ul>;
}

export function ExpandableItems({ items, limit, ...rest }: ListProps & { limit: number }) {
  const [expanded, setExpanded] = useState(false);
  const hidden = items.length - limit;
  return (
    <div className="space-y-3">
      <ItemList items={expanded ? items : items.slice(0, limit)} {...rest} />
      {hidden > 0 && <button type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)} className={TOGGLE}>{moreLabel(hidden, expanded)}</button>}
    </div>
  );
}

export function ItemGroupSection({ title, group, empty, ...handlers }: GroupProps) {
  const [expanded, setExpanded] = useState(false);
  const total = group.highlights.length + group.recorded.length;
  return (
    <section aria-label={title} className="space-y-3">
      <OverviewHeading title={title} count={total} />
      {total === 0 && <p className="text-sm text-ink-3">{empty}</p>}
      {group.highlights.length > 0 && <ItemList items={group.highlights} {...handlers} />}
      {group.recorded.length > 0 && <button type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)} className={TOGGLE}>{moreLabel(group.recorded.length, expanded)}</button>}
      {expanded && <ItemList items={group.recorded} {...handlers} />}
    </section>
  );
}
