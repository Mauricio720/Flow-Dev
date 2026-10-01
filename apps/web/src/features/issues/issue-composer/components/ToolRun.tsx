import { toolSource, type Source, type ToolCall } from "../model";
import { CELL, GUTTER_COMPACT, GraphRow, LANE_X, LANE_X_COMPACT, TRUNK_X, forkOffset, laneColor } from "./Graph";

const HEADER = 32;
const ROW = 36;
const ROW_COMPACT = 52;

type Geometry = { laneX: Record<Source, number>; width: number; row: number };
const wide: Geometry = { laneX: LANE_X, width: CELL * 3, row: ROW };
const compact: Geometry = { laneX: LANE_X_COMPACT, width: GUTTER_COMPACT, row: ROW_COMPACT };

// Lanes leave and rejoin the trunk at 45°, so the tail must fit the widest diagonal in use.
function blockHeight(g: Geometry, calls: number, sources: Source[], running: boolean) {
  const reach = Math.max(0, ...sources.map((source) => g.laneX[source] - TRUNK_X));
  return HEADER + calls * g.row + (running ? 8 : reach + 4);
}

const sourceLabel: Record<Source, string> = { project: "Projeto", github: "GitHub" };
const toolInk: Record<Source, string> = { project: "text-project-ink", github: "text-github-ink" };

export function ToolRun({ calls }: { calls: ToolCall[] }) {
  const running = calls.length === 0 || calls.some((call) => call.status === "running");
  const sources = (["project", "github"] as const).filter((source) => calls.some((call) => toolSource[call.tool] === source));
  const height = blockHeight(wide, calls.length, sources, running);
  const heightCompact = blockHeight(compact, calls.length, sources, running);

  return (
    <GraphRow
      className="pb-5"
      gutter={
        <>
          <Lanes calls={calls} sources={sources} running={running} geometry={wide} className="hidden sm:block" />
          <Lanes calls={calls} sources={sources} running={running} geometry={compact} className="sm:hidden" />
        </>
      }
    >
      <div
        className="min-h-(--h-compact) sm:min-h-(--h)"
        style={{ "--h": `${height}px`, "--h-compact": `${heightCompact}px` } as React.CSSProperties}
      >
        <p className="flex h-8 items-center gap-2 text-xs text-ink-3" aria-live="polite">
          {running ? "Consultando o contexto…" : `Contexto consultado · ${calls.length} ${calls.length === 1 ? "chamada" : "chamadas"}`}
          {sources.map((source) => (
            <span key={source} className={`hidden font-medium sm:inline ${toolInk[source]}`}>
              {sourceLabel[source]}
            </span>
          ))}
        </p>
        <ol>
          {calls.map((call) => {
            const source = toolSource[call.tool];
            return (
              <li
                key={call.id}
                className="row-strike grid h-13 grid-cols-[minmax(0,1fr)_auto] content-center gap-x-4 gap-y-0.5 border-b border-line/70 pl-2 sm:h-9 sm:grid-cols-[9.5rem_minmax(0,1fr)_7rem_3.25rem] sm:items-center sm:pl-0"
              >
                <span className={`min-w-0 truncate font-mono text-[13px] ${toolInk[source]}`}>{call.tool}</span>
                <span
                  className="col-span-2 row-start-2 min-w-0 truncate font-mono text-xs text-ink-2 sm:col-span-1 sm:row-start-auto sm:text-[13px]"
                  title={call.target}
                >
                  {call.target}
                </span>
                <span className={`col-start-2 row-start-1 text-right text-[13px] sm:col-start-auto sm:row-start-auto sm:text-left ${call.status === "empty" ? "text-ink-3" : "text-ink"}`}>
                  {call.status === "running" ? <span className="text-ink-3">consultando…</span> : call.result}
                </span>
                <span className="hidden text-right font-mono text-xs text-ink-3 tabular-nums sm:block">
                  {call.status === "running" ? "" : `${call.ms}ms`}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </GraphRow>
  );
}

type LanesProps = {
  calls: ToolCall[];
  sources: Source[];
  running: boolean;
  geometry: Geometry;
  className: string;
};

// Transit-map grammar: each source forks off the trunk at 45°, carries a stop per call, and rejoins at 45° when done.
function Lanes({ calls, sources, running, geometry, className }: LanesProps) {
  const { laneX, width, row } = geometry;
  const rowsEnd = HEADER + calls.length * row;
  const height = blockHeight(geometry, calls.length, sources, running);
  const cy = (i: number) => HEADER + i * row + row / 2;

  return (
    <svg width={width} height={height} className={`absolute top-0 left-0 overflow-visible ${className}`}>
      {sources.map((source) => {
        const x = laneX[source];
        const reach = x - TRUNK_X;
        const forkStart = forkOffset(source, sources, laneX);
        const forkEnd = forkStart + reach;
        const lastY = running ? cy(calls.length - 1) : rowsEnd;
        return (
          <g key={source} stroke={laneColor[source]} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d={`M${TRUNK_X} ${forkStart} L${x} ${forkEnd}`} pathLength={1} className="lane-draw" />
            {calls.map((_, i) => {
              const from = Math.max(forkEnd, i === 0 ? forkEnd : cy(i - 1));
              const to = i === calls.length - 1 ? lastY : cy(i);
              return to > from ? <path key={i} d={`M${x} ${from} V${to}`} pathLength={1} className="lane-draw" /> : null;
            })}
            {!running && <path d={`M${x} ${rowsEnd} L${TRUNK_X} ${rowsEnd + reach}`} pathLength={1} className="lane-draw" />}
            {calls.map((call, i) =>
              toolSource[call.tool] === source ? (
                <g key={call.id}>
                  <line x1={x + 7} x2={width} y1={cy(i)} y2={cy(i)} strokeWidth={1} strokeOpacity={0.45} />
                  <circle
                    cx={x}
                    cy={cy(i)}
                    r={5}
                    fill="var(--ground)"
                    strokeWidth={2.5}
                    strokeDasharray={call.status === "empty" ? "2.5 2.5" : undefined}
                    className={call.status === "running" ? "node-running" : undefined}
                  />
                </g>
              ) : null,
            )}
          </g>
        );
      })}
    </svg>
  );
}
