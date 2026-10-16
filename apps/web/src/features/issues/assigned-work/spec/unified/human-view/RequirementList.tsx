import { NO_TESTS_LINKED, SUBTITLES } from "./humanViewCopy";
import { itemDomId, useViewLinks } from "./humanViewNav";
import { DETAIL_LABEL } from "./overviewCopy";
import { InlineText, SourceLink } from "./OverviewText";
import type { Criterion, Requirement } from "./viewTypes";

function Criteria({ title, items }: { title: string; items: Criterion[] }) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <h6 className="text-xs font-medium text-ink-3">{title}</h6>
      <ul className="space-y-1.5">{items.map((item) => <li key={item.id} className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-2 text-sm leading-6"><span className="font-mono text-xs leading-6 text-ink-3">{item.id.split(".").at(-1)}</span><span className="text-ink-2"><InlineText text={item.text} /></span></li>)}</ul>
    </div>
  );
}

function RequirementCard({ requirement }: { requirement: Requirement }) {
  const links = useViewLinks();
  if (!links) return null;
  return (
    <li id={itemDomId(requirement.code)} tabIndex={-1} className="scroll-mt-28 space-y-3 py-4 first:pt-0 last:pb-0">
      <div className="space-y-1">
        <p className="font-mono text-xs text-ink-3">{requirement.code}</p>
        <h6 className="text-[15px] leading-6 font-semibold text-ink"><InlineText text={requirement.title} /></h6>
        {requirement.meta.length > 0 && <p className="text-xs text-ink-3">{requirement.meta.join(" · ")}</p>}
        {requirement.detail[0] && <p className="max-w-[65ch] text-sm leading-6 text-ink-2"><InlineText text={requirement.detail[0]} /></p>}
      </div>
      <details className="group">
        <summary className="cursor-pointer text-sm text-ink-2 marker:text-ink-3 hover:text-ink">{DETAIL_LABEL}: {requirement.acceptance.length} {SUBTITLES.acceptance.toLowerCase()}, {requirement.edges.length} {SUBTITLES.edges.toLowerCase()}</summary>
        <div className="mt-3 space-y-3"><Criteria title={SUBTITLES.acceptance} items={requirement.acceptance} /><Criteria title={SUBTITLES.edges} items={requirement.edges} /></div>
      </details>
      <p className="text-xs leading-5 text-ink-2"><span className="text-ink-3">{SUBTITLES.tests}: </span>{requirement.tests.length > 0 ? <span className="font-mono">{requirement.tests.join(", ")}</span> : NO_TESTS_LINKED}</p>
      <SourceLink source={requirement.source} onOpen={links.openSource} />
    </li>
  );
}

export function RequirementList({ requirements }: { requirements: Requirement[] }) {
  return <ul className="divide-y divide-line">{requirements.map((requirement) => <RequirementCard key={requirement.code} requirement={requirement} />)}</ul>;
}
