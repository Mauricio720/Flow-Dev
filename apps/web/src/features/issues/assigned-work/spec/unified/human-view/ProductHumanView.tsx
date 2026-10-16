"use client";

import type { ReactNode } from "react";
import { NAV_LABELS, PRODUCT_SECTIONS, SUBTITLES } from "./humanViewCopy";
import { useViewLinks } from "./humanViewNav";
import { JourneyList } from "./JourneyList";
import { ItemList } from "./OverviewItems";
import type { OverviewItem } from "./overviewTypes";
import { InlineText, SourceLink } from "./OverviewText";
import { RequirementList } from "./RequirementList";
import { SectionedView, type ViewSection } from "./SectionedView";
import type { ArtifactView } from "./viewTypes";

type Props = { view: ArtifactView; activeId: string | null; onPick: (id: string) => void; footer: ReactNode; onOpenDocument: (path: string) => void };

function Block({ title, items, onOpenDocument }: { title?: string; items: OverviewItem[]; onOpenDocument: (path: string) => void }) {
  const links = useViewLinks();
  if (items.length === 0 || !links) return null;
  return <div className="space-y-2">{title && <h6 className="text-xs font-medium text-ink-3">{title}</h6>}<ItemList items={items} onOpenSource={links.openSource} onOpenDocument={onOpenDocument} /></div>;
}

function hasSummary(view: ArtifactView) {
  return Boolean(view.overview.what ?? view.overview.why) || view.product.goals.length + view.product.nonGoals.length > 0;
}

function Summary({ view, onOpenDocument }: Pick<Props, "view" | "onOpenDocument">) {
  const links = useViewLinks();
  const { what, why } = view.overview;
  if (!links) return null;
  return (
    <div className="space-y-5">
      {what && <p className="max-w-[65ch] text-base leading-7 text-ink"><InlineText text={what.text} onOpenDocument={onOpenDocument} /></p>}
      {why && <p className="max-w-[65ch] text-[15px] leading-7 text-ink-2"><InlineText text={why.text} onOpenDocument={onOpenDocument} /></p>}
      {(what ?? why) && <SourceLink source={(what ?? why)!.source} onOpen={links.openSource} />}
      <Block title={SUBTITLES.goals} items={view.product.goals} onOpenDocument={onOpenDocument} />
      <Block title={SUBTITLES.limits} items={view.product.nonGoals} onOpenDocument={onOpenDocument} />
    </div>
  );
}

function section(id: keyof typeof PRODUCT_SECTIONS, count: number | null, content: ReactNode | null): ViewSection {
  return { id, label: PRODUCT_SECTIONS[id], count, content };
}

export function productSections({ view, onOpenDocument }: Pick<Props, "view" | "onOpenDocument">): ViewSection[] {
  const { product } = view;
  const block = (items: OverviewItem[], title?: string) => (items.length > 0 ? <Block title={title} items={items} onOpenDocument={onOpenDocument} /> : null);
  const decisions = product.decisions.length + product.openQuestions.length > 0 ? <div className="space-y-6">{block(product.decisions)}{block(product.openQuestions, SUBTITLES.open)}</div> : null;
  const requirements = product.requirements.length + product.rules.length > 0 ? <div className="space-y-6"><RequirementList requirements={product.requirements} />{block(product.rules, SUBTITLES.rules)}</div> : null;
  return [
    section("summary", null, hasSummary(view) ? <Summary view={view} onOpenDocument={onOpenDocument} /> : null),
    section("journeys", product.journeys.length, product.journeys.length > 0 ? <JourneyList journeys={product.journeys} onOpenDocument={onOpenDocument} /> : null),
    section("requirements", product.requirements.length, requirements),
    section("personas", product.personas.length, block(product.personas)),
    section("decisions", product.decisions.length, decisions),
    section("metrics", product.metrics.length, block(product.metrics)),
    section("risks", product.risks.length, block(product.risks)),
  ];
}

export function ProductHumanView({ view, activeId, onPick, footer, onOpenDocument }: Props) {
  return <SectionedView label={NAV_LABELS.product} sections={productSections({ view, onOpenDocument })} activeId={activeId} onPick={onPick} footer={footer} />;
}
