import type { ReactNode } from "react";
import { CheckIcon } from "@/components/icons";

// Lanes snap to the 24px cell grid: trunk on the first cell centre, one cell per source.
export const CELL = 24;
export const TRUNK_X = CELL / 2;
export const LANE_X = { project: CELL * 1.5, github: CELL * 2.5 } as const;
// Phones get a two-cell gutter; source lanes tighten to half-cell spacing there.
export const LANE_X_COMPACT = { project: 26, github: 40 } as const;
export const GUTTER_COMPACT = 52;
const FORK_STAGGER = 14;

// Outer lanes leave the trunk first so parallel 45° departures never share a segment.
export function forkOffset(source: "project" | "github", sources: readonly ("project" | "github")[], laneX: Record<"project" | "github", number>) {
  const rank = [...sources].sort((a, b) => laneX[b] - laneX[a]).indexOf(source);
  return rank * FORK_STAGGER;
}

export const laneColor = { project: "var(--lane-project)", github: "var(--lane-github)" } as const;

export type NodeKind = "user" | "agent" | "clarify" | "draft" | "published" | "head";

export function GraphNode({ kind, running = false }: { kind: NodeKind; running?: boolean }) {
  const base = "absolute left-[12px] top-(--node-y,11px) -translate-x-1/2 -translate-y-1/2";
  switch (kind) {
    case "user":
      return <span aria-hidden="true" className={`${base} size-3 rounded-full border-2 border-ink bg-ground`} />;
    case "agent":
      return <span aria-hidden="true" className={`${base} size-3 rounded-full bg-ink ${running ? "node-running" : ""}`} />;
    case "clarify":
      return <span aria-hidden="true" className={`${base} size-3.5 rounded-full border-[3px] border-clarify bg-ground`} />;
    case "draft":
      return <span aria-hidden="true" className={`${base} size-4 rounded-[4px] border-[3px] border-merge bg-ground`} />;
    case "published":
      return (
        <span aria-hidden="true" className={`${base} grid size-5 place-items-center rounded-full bg-merge text-ground`}>
          <CheckIcon size={12} strokeWidth={3} />
        </span>
      );
    case "head":
      return (
        <svg aria-hidden="true" width={16} height={16} className={base}>
          <circle cx={8} cy={8} r={6} fill="var(--ground)" stroke="var(--ink-2)" strokeWidth={2} strokeDasharray="3 2.5" />
        </svg>
      );
  }
}

type RowProps = {
  node?: NodeKind;
  running?: boolean;
  first?: boolean;
  last?: boolean;
  trunk?: "ink" | "merge" | "none";
  /** Vertical centre of the node, in px from the row top. */
  nodeY?: number;
  gutter?: ReactNode;
  children: ReactNode;
  className?: string;
};

// One thread row: a 72px lane gutter (three cells) and the content column.
export function GraphRow({ node, running, first, last, trunk = "ink", nodeY = 11, gutter, children, className = "" }: RowProps) {
  return (
    <div
      className="relative grid grid-cols-[52px_minmax(0,1fr)] sm:grid-cols-[72px_minmax(0,1fr)]"
      style={{ "--node-y": `${nodeY}px` } as React.CSSProperties}
    >
      <div className="relative" aria-hidden="true">
        {trunk !== "none" && (
          <span
            className={`absolute left-[11px] w-[2px] ${trunk === "merge" ? "bg-merge" : "bg-ink"}`}
            style={{ top: first ? nodeY : 0, bottom: last ? `calc(100% - ${nodeY}px)` : 0 }}
          />
        )}
        {gutter}
      </div>
      {node && <GraphNode kind={node} running={running} />}
      <div className={`min-w-0 ${className}`}>{children}</div>
    </div>
  );
}

// Renders `inline code` spans inside plain agent/user prose.
export function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split(/(`[^`]+`)/g).map((part, i) =>
        part.startsWith("`") && part.endsWith("`") ? (
          <code key={i} className="rounded-[4px] bg-ink/[0.06] px-1 py-px font-mono text-[0.86em] text-ink">
            {part.slice(1, -1)}
          </code>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}
