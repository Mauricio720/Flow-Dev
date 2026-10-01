"use client";

import { Badge } from "@/components/ui/badge";
import { REPO, type IssueDraft, type Session, type Source } from "../model";
import { GUTTER_COMPACT, GraphRow, LANE_X, LANE_X_COMPACT, RichText, TRUNK_X, forkOffset, laneColor } from "./Graph";
import { IssueDraftBlock } from "./IssueDraftBlock";
import { ToolRun } from "./ToolRun";

type Props = {
  session: Session;
  onDraftChange: (itemId: string, draft: IssueDraft) => void;
  onPublish: (itemId: string) => void;
};

const MERGE_Y = 76;

// The draft is an interchange: every lane the draft cites forks off the trunk on its own and drops into
// one capsule with the trunk; a merge-green leader carries the capsule to the draft block.
function MergeLanes({
  sources,
  laneX,
  width,
  published,
  className,
}: {
  sources: Source[];
  laneX: Record<Source, number>;
  width: number;
  published: boolean;
  className: string;
}) {
  const outer = Math.max(TRUNK_X, ...sources.map((source) => laneX[source]));
  return (
    <svg width={width} height={MERGE_Y + 10} className={`absolute top-0 left-0 ${className}`} aria-hidden="true">
      {sources.map((source) => {
        const x = laneX[source];
        const start = forkOffset(source, sources, laneX);
        return (
          <path
            key={source}
            d={`M${TRUNK_X} ${start} L${x} ${start + x - TRUNK_X} V${MERGE_Y}`}
            stroke={laneColor[source]}
            strokeWidth={2}
            fill="none"
            strokeLinejoin="round"
            pathLength={1}
            className="lane-draw"
          />
        );
      })}
      <line x1={outer + 8} x2={width} y1={MERGE_Y} y2={MERGE_Y} stroke="var(--lane-merge)" strokeWidth={2} />
      <rect
        x={TRUNK_X - 8}
        y={MERGE_Y - 8}
        width={outer - TRUNK_X + 16}
        height={16}
        rx={8}
        fill={published ? "var(--lane-merge)" : "var(--ground)"}
        stroke="var(--lane-merge)"
        strokeWidth={3}
      />
      {published && <circle cx={TRUNK_X} cy={MERGE_Y} r={2.5} fill="var(--ground)" />}
    </svg>
  );
}

function Byline({ who, at, tone = "text-ink" }: { who: string; at: string; tone?: string }) {
  return (
    <p className="flex h-[22px] items-center gap-2 text-sm">
      <span className={`font-medium ${tone}`}>{who}</span>
      <span className="font-mono text-xs text-ink-3 tabular-nums">{at}</span>
    </p>
  );
}

export function Thread({ session, onDraftChange, onPublish }: Props) {
  const thinking = session.phase === "thinking";
  const last = session.items.at(-1);
  const waitingOnAgent = thinking && last?.kind !== "tools";
  // Once an issue is published the trunk below it runs in the merge colour.
  const publishedAt = session.items.findIndex((item) => item.kind === "draft" && item.status === "published");
  const merged = publishedAt !== -1;

  return (
    <ol aria-label={`Conversa: ${session.title}`}>
      {session.items.map((item, index) => {
        const first = index === 0;
        const trunk = merged && index > publishedAt ? "merge" : "ink";

        switch (item.kind) {
          case "user":
            return (
              <li key={item.id}>
                <GraphRow node="user" first={first} trunk={trunk} className="pb-7">
                  <Byline who="Você" at={item.at} />
                  <p className="mt-1 max-w-[65ch] text-[15px] leading-relaxed">
                    <RichText text={item.text} />
                  </p>
                </GraphRow>
              </li>
            );
          case "agent":
            return (
              <li key={item.id}>
                <GraphRow node="agent" first={first} trunk={trunk} className="pb-7">
                  <Byline who="Issue Author" at={item.at} />
                  <p className="mt-1 max-w-[65ch] text-[15px] leading-relaxed text-ink-2">
                    <RichText text={item.text} />
                  </p>
                </GraphRow>
              </li>
            );
          case "clarify":
            return (
              <li key={item.id}>
                <GraphRow node="clarify" first={first} trunk={trunk} className="pb-7">
                  <p className="flex h-[22px] items-center gap-2 text-sm">
                    <span className="font-medium">Issue Author</span>
                    <Badge variant="clarify" className="py-px">pergunta</Badge>
                    <span className="font-mono text-xs text-ink-3 tabular-nums">{item.at}</span>
                  </p>
                  <p className="mt-1 max-w-[65ch] text-[15px] leading-relaxed">
                    <RichText text={item.text} />
                  </p>
                </GraphRow>
              </li>
            );
          case "tools":
            return (
              <li key={item.id}>
                <ToolRun calls={item.calls} />
              </li>
            );
          case "draft": {
            const cited = (["project", "github"] as const).filter((source) => item.draft.references.some((ref) => ref.source === source));
            return (
              <li key={item.id} data-anchor="draft">
                <GraphRow
                  first={first}
                  trunk={trunk}
                  nodeY={MERGE_Y}
                  className="pt-12 pb-7"
                  gutter={
                    <>
                      <MergeLanes sources={cited} laneX={LANE_X} width={72} published={item.status === "published"} className="hidden sm:block" />
                      <MergeLanes
                        sources={cited}
                        laneX={LANE_X_COMPACT}
                        width={GUTTER_COMPACT}
                        published={item.status === "published"}
                        className="sm:hidden"
                      />
                    </>
                  }
                >
                  <IssueDraftBlock item={item} onChange={(draft) => onDraftChange(item.id, draft)} onPublish={() => onPublish(item.id)} />
                </GraphRow>
                {item.status === "published" && (
                  <GraphRow
                    trunk="none"
                    className="pt-5 pb-7"
                    nodeY={32}
                    gutter={
                      <>
                        <span className="trunk-grow absolute top-0 bottom-0 left-[11px] w-[2px] bg-merge" />
                        <span className="absolute top-[32px] left-[12px] grid size-4 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-merge">
                          <span className="size-1.5 rounded-full bg-ground" />
                        </span>
                      </>
                    }
                  >
                    <p className="flex h-6 items-center gap-2 text-sm">
                      <span className="font-medium text-merge-ink">origin</span>
                      <span className="font-mono text-xs text-ink-2">
                        {REPO} · #{item.issueNumber}
                      </span>
                    </p>
                  </GraphRow>
                )}
              </li>
            );
          }
        }
      })}
      {waitingOnAgent && (
        <li>
          <GraphRow node="agent" running trunk={merged ? "merge" : "ink"} className="pb-7">
            <Byline who="Issue Author" at="agora" />
            <p className="mt-1 text-[15px] text-ink-3">Escrevendo…</p>
          </GraphRow>
        </li>
      )}
    </ol>
  );
}
