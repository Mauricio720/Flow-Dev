import { useViewLinks } from "./humanViewNav";
import { STORY_LINK, storyMeta } from "./overviewCopy";
import type { Capability, OpenSource } from "./overviewTypes";
import { InlineText } from "./OverviewText";

type Props = { capabilities: Capability[]; onOpenSource: OpenSource };

export function CapabilityList({ capabilities, onOpenSource }: Props) {
  const links = useViewLinks();
  const openStory = (capability: Capability) => (links ? links.openItem({ mode: "product", section: "requirements", itemId: capability.code }) : onOpenSource(capability.source));
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {capabilities.map((capability) => {
        const meta = [...capability.meta, ...storyMeta(capability.criteria, capability.edgeCases)];
        return (
          <li key={capability.id} className="flex flex-col gap-1 rounded-md bg-surface px-3 py-2.5">
            <span className="font-mono text-xs text-ink-3">{capability.code}</span>
            <span className="text-sm leading-6 font-medium text-ink"><InlineText text={capability.title} /></span>
            {meta.length > 0 && <span className="text-xs leading-5 text-ink-3">{meta.join(" · ")}</span>}
            <button type="button" onClick={() => openStory(capability)} aria-label={`${STORY_LINK} ${capability.code}`} className="mt-auto self-start rounded-sm pt-1 text-xs text-ink-2 underline decoration-line underline-offset-4 hover:text-ink hover:decoration-ink">{STORY_LINK}</button>
          </li>
        );
      })}
    </ul>
  );
}
