"use client";

import { FlowSkeleton } from "./FlowSkeletons";
import { FlowTabSections } from "./FlowTabSections";
import { tabStage, type FlowTab } from "./flowTabs";
import type { FlowCommands, FlowView } from "./flowView";
import { NowPanel } from "./NowPanel";
import { retryOffer } from "./retryOffer";
import { ReviewGuide } from "./ReviewGuide";
import { StageCapsule } from "./StageCapsule";
import { FLOW_REGION_LABEL } from "./unifiedCopy";

type Props = { tab: FlowTab; view: FlowView };
const REVIEW_STAGES = ["spec_review", "tasks_review"];

function Notices({ failed, loading, notice }: { failed: boolean; loading: boolean; notice: FlowCommands["notice"] }) {
  return (
    <>
      {failed && <p role="status" className="text-sm text-destructive">Perdemos o contato com o servidor. O último estado conhecido continua visível.</p>}
      {loading && <FlowSkeleton />}
      {notice && <p role={notice.tone === "error" ? "alert" : "status"} className={notice.tone === "error" ? "text-sm text-destructive" : "text-sm text-ink-2"}>{notice.text}</p>}
    </>
  );
}

function TurnPanel({ view }: { view: FlowView }) {
  const { data, commands, canAct } = view;
  const retry = canAct ? retryOffer(data.overview?.plan ?? null, data.options, data.runs?.items ?? [], commands) : null;
  return <NowPanel stage={view.turn} runs={data.runs?.items ?? []} target={view.target} canAct={canAct} busy={commands.busy} retry={retry} onChanged={data.refresh} onCancel={(runId) => void commands.cancelRun(runId)} />;
}

export function FlowTabPanel({ tab, view }: Props) {
  const { data, commands } = view;
  const stage = tabStage(tab, view.stages);
  const onTurn = tab.stages.includes(view.turn.key);
  const waiting = !onTurn && stage.state === "pending";
  return (
    <section aria-label={FLOW_REGION_LABEL} className="overflow-hidden rounded-xl border border-line bg-raised">
      <header className="flex min-h-[52px] flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-line px-5 py-2.5"><h2 className="text-[17px] font-semibold">{tab.label}</h2>{data.overview && <StageCapsule stage={stage} canAct={view.canAct} />}</header>
      <div className="flex flex-col gap-6 px-5 py-5">
        <Notices failed={data.failed} loading={!data.overview && !data.failed} notice={commands.notice} />
        {data.overview && onTurn && <TurnPanel view={view} />}
        {data.overview && waiting && <p className="max-w-[62ch] text-sm leading-6 text-ink-2">{tab.waitingNote}</p>}
        {data.overview && tab.review && stage.state !== "done" && <ReviewGuide />}
        {data.overview && <FlowTabSections tab={tab} view={view} documentsFirst={stage.state === "done" || (onTurn && REVIEW_STAGES.includes(view.turn.key))} waiting={waiting} />}
      </div>
    </section>
  );
}
