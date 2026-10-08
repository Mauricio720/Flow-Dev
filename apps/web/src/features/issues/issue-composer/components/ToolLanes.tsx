import type { ToolActivity } from "../contract";
import type { SourceKind } from "../draftSources";
import { TOOL_SOURCE } from "../toolModel";
import { CELL, GUTTER_COMPACT, LANE_X, LANE_X_COMPACT, TRUNK_X, forkOffset, laneColor } from "@/components/tasks/Graph";

const HEADER = 32;
const STOP_RADIUS = 5;
const UNSETTLED_DASH = "2.5 2.5";
const SETTLED_STATUS = "done";

export type Geometry = { laneX: Record<SourceKind, number>; width: number; row: number };
export const WIDE_LANES: Geometry = { laneX: LANE_X, width: CELL * 3, row: 36 };
export const COMPACT_LANES: Geometry = { laneX: LANE_X_COMPACT, width: GUTTER_COMPACT, row: 52 };

type LanesProps = { calls: ToolActivity[]; sources: SourceKind[]; geometry: Geometry; className: string };
type LaneProps = Omit<LanesProps, "className"> & { source: SourceKind };

// Lanes leave and rejoin the trunk at 45°, so the tail must fit the widest diagonal in use.
export function blockHeight(geometry: Geometry, calls: number, sources: SourceKind[]) {
  const reach = Math.max(0, ...sources.map((source) => geometry.laneX[source] - TRUNK_X));
  return HEADER + calls * geometry.row + reach + 4;
}

function Lane({ source, calls, sources, geometry }: LaneProps) {
  const x = geometry.laneX[source];
  const reach = x - TRUNK_X;
  const fork = forkOffset(source, sources, geometry.laneX);
  const rowsEnd = HEADER + calls.length * geometry.row;
  const centre = (index: number) => HEADER + index * geometry.row + geometry.row / 2;
  return (
    <g stroke={laneColor[source]} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={`M${TRUNK_X} ${fork} L${x} ${fork + reach} V${rowsEnd} L${TRUNK_X} ${rowsEnd + reach}`} pathLength={1} className="lane-draw" />
      {calls.map((call, index) => TOOL_SOURCE[call.tool] === source && (
        <g key={call.toolCallId}>
          <line x1={x + 7} x2={geometry.width} y1={centre(index)} y2={centre(index)} strokeWidth={1} strokeOpacity={0.45} />
          <circle cx={x} cy={centre(index)} r={STOP_RADIUS} fill="var(--ground)" strokeWidth={2.5} strokeDasharray={call.status === SETTLED_STATUS ? undefined : UNSETTLED_DASH} />
        </g>
      ))}
    </g>
  );
}

// Transit-map grammar: each source forks off the trunk at 45°, carries a stop per call, and rejoins at 45° when done.
export function ToolLanes({ calls, sources, geometry, className }: LanesProps) {
  return (
    <svg width={geometry.width} height={blockHeight(geometry, calls.length, sources)} className={`absolute top-0 left-0 overflow-visible ${className}`}>
      {sources.map((source) => <Lane key={source} source={source} calls={calls} sources={sources} geometry={geometry} />)}
    </svg>
  );
}
