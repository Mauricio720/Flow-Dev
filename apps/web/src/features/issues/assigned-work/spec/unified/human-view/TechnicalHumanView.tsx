"use client";

import type { ReactNode } from "react";
import { ContractList } from "./ContractList";
import { FlowDiagramView } from "./FlowDiagramView";
import { NAV_LABELS, NO_DIAGRAM, SUBTITLES, TECHNICAL_SECTIONS } from "./humanViewCopy";
import { itemDomId, useViewLinks } from "./humanViewNav";
import { ExpandableItems } from "./OverviewItems";
import type { OverviewItem } from "./overviewTypes";
import { InlineText, SourceLink } from "./OverviewText";
import { SectionedView, type ViewSection } from "./SectionedView";
import { TestMatrix } from "./TestMatrix";
import type { ArtifactView, DataFlow } from "./viewTypes";

type Props = { view: ArtifactView; activeId: string | null; onPick: (id: string) => void; footer: ReactNode; onOpenDocument: (path: string) => void };
type Group = { title?: string; items: OverviewItem[]; mono?: boolean };
const GROUP_LIMIT = 8;

function Groups({ groups, onOpenDocument }: { groups: Group[]; onOpenDocument: (path: string) => void }) {
  const links = useViewLinks();
  const present = groups.filter((group) => group.items.length > 0);
  if (!links || present.length === 0) return null;
  return <div className="space-y-6">{present.map((group, index) => <div key={index} className="space-y-2">{group.title && <h6 className="text-xs font-medium text-ink-3">{group.title}</h6>}<ExpandableItems items={group.items} limit={GROUP_LIMIT} mono={group.mono} onOpenSource={links.openSource} onOpenDocument={onOpenDocument} /></div>)}</div>;
}

function DataFlows({ flows }: { flows: DataFlow[] }) {
  const links = useViewLinks();
  return <div className="space-y-6">{flows.map((flow) => <article key={flow.id} id={itemDomId(flow.id)} tabIndex={-1} aria-label={flow.title.replace(/`/g, "")} className="scroll-mt-28 space-y-2"><h6 className="text-sm font-semibold text-ink"><InlineText text={flow.title} /></h6><ol className="list-decimal space-y-1.5 pl-5 text-sm leading-6 text-ink-2 marker:text-ink-3">{flow.steps.map((step, index) => <li key={index} className="pl-1"><InlineText text={step} /></li>)}</ol>{links && <SourceLink source={flow.source} onOpen={links.openSource} />}</article>)}</div>;
}

function groups(items: Group[], onOpenDocument: (path: string) => void) {
  return items.some((group) => group.items.length > 0) ? <Groups groups={items} onOpenDocument={onOpenDocument} /> : null;
}

function architecture(view: ArtifactView, onOpenDocument: (path: string) => void) {
  const { diagrams, boundaries } = view.technical;
  if (diagrams.length === 0 && boundaries.length === 0) return null;
  return <div className="space-y-6">{diagrams.length > 0 ? diagrams.map((diagram) => <FlowDiagramView key={diagram.id} diagram={diagram} />) : <p className="text-sm text-ink-3">{NO_DIAGRAM}</p>}{groups([{ title: SUBTITLES.boundaries, items: boundaries }], onOpenDocument)}</div>;
}

function technicalSections(view: ArtifactView, onOpenDocument: (path: string) => void): ViewSection[] {
  const { technical, product } = view;
  const tests = technical.coverage.length + technical.testCases.length > 0 ? <TestMatrix coverage={technical.coverage} testCases={technical.testCases} requirements={product.requirements} /> : null;
  const section = (id: keyof typeof TECHNICAL_SECTIONS, count: number | null, content: ReactNode | null): ViewSection => ({ id, label: TECHNICAL_SECTIONS[id], count, content });
  return [
    section("architecture", technical.diagrams.length + technical.boundaries.length, architecture(view, onOpenDocument)),
    section("components", technical.components.length, groups([{ items: technical.components }], onOpenDocument)),
    section("contracts", technical.contracts.length, technical.contracts.length > 0 ? <ContractList contracts={technical.contracts} onOpenDocument={onOpenDocument} /> : null),
    section("dataFlow", technical.dataFlows.length, technical.dataFlows.length > 0 ? <DataFlows flows={technical.dataFlows} /> : null),
    section("decisions", technical.decisions.length + technical.alternatives.length, groups([{ items: technical.decisions }, { title: SUBTITLES.alternatives, items: technical.alternatives }], onOpenDocument)),
    section("risks", technical.risks.length + technical.invariants.length, groups([{ items: technical.risks }, { title: SUBTITLES.invariants, items: technical.invariants }], onOpenDocument)),
    section("impact", technical.impacts.length, groups([{ items: technical.impacts, mono: true }], onOpenDocument)),
    section("tests", technical.coverage.length, tests),
  ];
}

export function TechnicalHumanView({ view, activeId, onPick, footer, onOpenDocument }: Props) {
  return <SectionedView label={NAV_LABELS.technical} sections={technicalSections(view, onOpenDocument)} activeId={activeId} onPick={onPick} footer={footer} />;
}
