"use client";

import { concludeOffer, concludedByOperator } from "./concludeOffer";
import { FlowSkeleton } from "./FlowSkeletons";
import { FlowTabSections } from "./FlowTabSections";
import { tabStage, type FlowTab } from "./flowTabs";
import type { FlowCommands, FlowView } from "./flowView";
import { ACTIVE_RUN_STATES } from "./flowStages";
import { NowPanel, type RetryOffer } from "./NowPanel";
import { PullRequestLink } from "./PullRequestLink";
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

function turnRetry(view: FlowView) {
  const { data, commands, canAct } = view;
  return canAct ? retryOffer(data.overview?.plan ?? null, data.options, data.runs?.items ?? [], commands) : null;
}

function TurnPanel({ view, retry }: { view: FlowView; retry: RetryOffer | null }) {
  const { data, commands, canAct } = view;
  const plan = data.overview?.plan ?? null;
  const conclude = canAct ? concludeOffer(plan, commands) : null;
  return <NowPanel stage={view.turn} runs={data.runs?.items ?? []} target={view.target} canAct={canAct} busy={commands.busy} retry={retry} conclude={conclude} concluded={concludedByOperator(plan)} onChanged={data.refresh} onCancel={(runId) => void commands.cancelRun(runId)} />;
}

export function FlowTabPanel({ tab, view }: Props) {
  const { data, commands } = view;
  const stage = tabStage(tab, view.stages);
  const onTurn = tab.stages.includes(view.turn.key);
  const waiting = !onTurn && stage.state === "pending";
  const retry = onTurn ? turnRetry(view) : null;
  const running = data.runs?.items.some((run) => ACTIVE_RUN_STATES.includes(run.state)) ?? false;
  return (
    <section aria-label={FLOW_REGION_LABEL} className="overflow-hidden rounded-xl border border-line bg-raised">
      <header className="flex min-h-[52px] flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-line px-5 py-2.5"><h2 className="text-[17px] font-semibold">{tab.label}</h2>{data.overview && <StageCapsule stage={stage} canAct={view.canAct} />}</header>
      <div className="flex flex-col gap-6 px-5 py-5">
        <Notices failed={data.failed} loading={!data.overview && !data.failed} notice={commands.notice} />
        {data.overview && onTurn && <TurnPanel view={view} retry={retry} />}
        {data.overview && waiting && <p className="max-w-[62ch] text-sm leading-6 text-ink-2">{tab.waitingNote}</p>}
        {data.overview && tab.review && stage.state !== "done" && <ReviewGuide />}
        {stage.key === "pull_request" && stage.state === "done" && view.canAct && <PullRequestLink target={view.target} />}
        {data.overview && <FlowTabSections tab={tab} view={view} documentsFirst={stage.state === "done" || (onTurn && REVIEW_STAGES.includes(view.turn.key))} waiting={waiting} resumeActionId={retry && !running ? retry.action.id : null} />}
      </div>
    </section>
  );
}
