import type { SourceKind } from "../draftSources";
import { TRUNK_X, forkOffset, laneColor } from "@/components/tasks/Graph";

export const MERGE_Y = 76;
const CAPSULE_RADIUS = 8;

type Props = { sources: SourceKind[]; laneX: Record<SourceKind, number>; width: number; published: boolean; className: string };

// The draft is an interchange: every lane the draft cites forks off the trunk on its own and drops into
// one capsule with the trunk; a merge-green leader carries the capsule to the draft block.
export function MergeLanes({ sources, laneX, width, published, className }: Props) {
  const outer = Math.max(TRUNK_X, ...sources.map((source) => laneX[source]));
  const lanePath = (source: SourceKind) => {
    const start = forkOffset(source, sources, laneX);
    return `M${TRUNK_X} ${start} L${laneX[source]} ${start + laneX[source] - TRUNK_X} V${MERGE_Y}`;
  };
  return (
    <svg width={width} height={MERGE_Y + 10} className={`absolute top-0 left-0 ${className}`} aria-hidden="true">
      {sources.map((source) => <path key={source} d={lanePath(source)} stroke={laneColor[source]} strokeWidth={2} fill="none" strokeLinejoin="round" pathLength={1} className="lane-draw" />)}
      <line x1={outer + CAPSULE_RADIUS} x2={width} y1={MERGE_Y} y2={MERGE_Y} stroke="var(--lane-merge)" strokeWidth={2} />
      <rect x={TRUNK_X - CAPSULE_RADIUS} y={MERGE_Y - CAPSULE_RADIUS} width={outer - TRUNK_X + CAPSULE_RADIUS * 2} height={CAPSULE_RADIUS * 2} rx={CAPSULE_RADIUS} fill={published ? "var(--lane-merge)" : "var(--ground)"} stroke="var(--lane-merge)" strokeWidth={3} />
      {published && <circle cx={TRUNK_X} cy={MERGE_Y} r={2.5} fill="var(--ground)" />}
    </svg>
  );
}
