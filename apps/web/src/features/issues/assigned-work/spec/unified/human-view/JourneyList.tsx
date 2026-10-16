import { JOURNEY_NOTE } from "./humanViewCopy";
import { itemDomId, useViewLinks } from "./humanViewNav";
import { ItemList } from "./OverviewItems";
import { InlineText, SourceLink } from "./OverviewText";
import type { Journey } from "./viewTypes";

type Props = { journeys: Journey[]; onOpenDocument: (path: string) => void };

function Steps({ steps }: { steps: string[] }) {
  return (
    <ol className="grid gap-2 sm:grid-cols-2">
      {steps.map((step, index) => (
        <li key={index} className="flex gap-3 rounded-md bg-surface px-3 py-2.5">
          <span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center rounded-full border border-line font-mono text-xs text-ink-2 tabular-nums">{index + 1}</span>
          <span className="text-sm leading-6 text-ink"><span className="sr-only">Passo {index + 1}: </span><InlineText text={step} /></span>
        </li>
      ))}
    </ol>
  );
}

export function JourneyList({ journeys, onOpenDocument }: Props) {
  const links = useViewLinks();
  if (!links) return null;
  return (
    <div className="space-y-6">
      {journeys.map((journey) => (
        <article key={journey.id} id={itemDomId(journey.id)} tabIndex={-1} aria-label={journey.title} className="scroll-mt-28 space-y-3">
          <h6 className="text-sm font-semibold text-ink"><InlineText text={journey.title} /></h6>
          {journey.steps.length > 0 && <Steps steps={journey.steps} />}
          {journey.scenarios.length > 0 && <ItemList items={journey.scenarios} onOpenSource={links.openSource} onOpenDocument={onOpenDocument} />}
          {journey.note && <div className="space-y-1"><p className="max-w-[65ch] text-[15px] leading-7 text-ink-2"><InlineText text={journey.note} onOpenDocument={onOpenDocument} /></p><p className="text-xs text-ink-3">{JOURNEY_NOTE}</p></div>}
          <SourceLink source={journey.source} onOpen={links.openSource} />
        </article>
      ))}
    </div>
  );
}
