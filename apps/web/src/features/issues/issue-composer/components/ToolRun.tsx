import type { CSSProperties } from "react";
import type { ToolActivity } from "../contract";
import { OUTCOME_LABEL, SOURCE_INK, SOURCE_LABEL, TOOL_SOURCE, citedSources } from "../toolModel";
import { GraphRow } from "./Graph";
import { COMPACT_LANES, ToolLanes, WIDE_LANES, blockHeight } from "./ToolLanes";

const SETTLED_STATUS = "done";

function callCount(total: number) {
  return `${total} ${total === 1 ? "chamada" : "chamadas"}`;
}

function ToolCallRow({ call }: { call: ToolActivity }) {
  const settled = call.status === SETTLED_STATUS;
  return (
    <li className="row-strike grid h-13 grid-cols-[minmax(0,1fr)_auto] content-center gap-x-4 gap-y-0.5 border-b border-line/70 pl-2 sm:h-9 sm:grid-cols-[9.5rem_minmax(0,1fr)_7rem_3.25rem] sm:items-center sm:pl-0">
      <span className={`min-w-0 truncate font-mono text-[13px] ${SOURCE_INK[TOOL_SOURCE[call.tool]]}`}>{call.tool}</span>
      <span className="col-span-2 row-start-2 min-w-0 truncate font-mono text-xs text-ink-2 sm:col-span-1 sm:row-start-auto sm:text-[13px]" title={call.target}>{call.target}</span>
      <span className={`col-start-2 row-start-1 text-right text-[13px] sm:col-start-auto sm:row-start-auto sm:text-left ${settled ? "text-ink" : "text-ink-3"}`} title={call.reason ?? undefined}>{OUTCOME_LABEL[call.status]}</span>
      <span className="hidden text-right font-mono text-xs text-ink-3 tabular-nums sm:block">{call.durationMs}ms</span>
    </li>
  );
}

export function ToolRun({ calls }: { calls: ToolActivity[] }) {
  const sources = citedSources(calls);
  const heights = { "--h": `${blockHeight(WIDE_LANES, calls.length, sources)}px`, "--h-compact": `${blockHeight(COMPACT_LANES, calls.length, sources)}px` } as CSSProperties;
  const lanes = (
    <>
      <ToolLanes calls={calls} sources={sources} geometry={WIDE_LANES} className="hidden sm:block" />
      <ToolLanes calls={calls} sources={sources} geometry={COMPACT_LANES} className="sm:hidden" />
    </>
  );
  return (
    <GraphRow className="pb-5" gutter={lanes}>
      <div className="min-h-(--h-compact) sm:min-h-(--h)" style={heights}>
        <p className="flex h-8 items-center gap-2 text-xs text-ink-3">
          Contexto consultado · {callCount(calls.length)}
          {sources.map((source) => <span key={source} className={`hidden font-medium sm:inline ${SOURCE_INK[source]}`}>{SOURCE_LABEL[source]}</span>)}
        </p>
        <ol aria-label="Consultas registradas">{calls.map((call) => <ToolCallRow key={call.toolCallId} call={call} />)}</ol>
      </div>
    </GraphRow>
  );
}
