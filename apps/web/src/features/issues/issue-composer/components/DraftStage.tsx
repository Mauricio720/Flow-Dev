import type { ReactNode } from "react";
import type { TaskPublication } from "../contract";
import type { DraftSource } from "../draftSources";
import { SOURCE_KINDS } from "../toolModel";
import { GUTTER_COMPACT, GraphRow, LANE_X, LANE_X_COMPACT } from "./Graph";
import { MERGE_Y, MergeLanes } from "./MergeLanes";

const WIDE_GUTTER = 72;
const ORIGIN_Y = 32;

type Props = { sources: DraftSource[]; publication: TaskPublication | null; children: ReactNode };

function OriginRow({ publication }: { publication: TaskPublication }) {
  const gutter = (
    <>
      <span className="trunk-grow absolute top-0 bottom-0 left-[11px] w-[2px] bg-merge" />
      <span className="absolute top-[32px] left-[12px] grid size-4 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-merge"><span className="size-1.5 rounded-full bg-ground" /></span>
    </>
  );
  return (
    <GraphRow trunk="none" className="pt-5 pb-7" nodeY={ORIGIN_Y} gutter={gutter}>
      <p className="flex h-6 flex-wrap items-center gap-2 text-sm">
        <span className="font-medium text-merge-ink">origin</span>
        <span className="font-mono text-xs text-ink-2 [overflow-wrap:anywhere]">{publication.repository} · #{publication.issueNumber}</span>
      </p>
    </GraphRow>
  );
}

export function DraftStage({ sources, publication, children }: Props) {
  const cited = SOURCE_KINDS.filter((kind) => sources.some((source) => source.kind === kind));
  const published = publication !== null;
  const gutter = (
    <>
      <MergeLanes sources={cited} laneX={LANE_X} width={WIDE_GUTTER} published={published} className="hidden sm:block" />
      <MergeLanes sources={cited} laneX={LANE_X_COMPACT} width={GUTTER_COMPACT} published={published} className="sm:hidden" />
    </>
  );
  return (
    <li data-anchor="draft">
      <GraphRow nodeY={MERGE_Y} className="pt-12 pb-7" gutter={gutter}>{children}</GraphRow>
      {publication && <OriginRow publication={publication} />}
    </li>
  );
}
