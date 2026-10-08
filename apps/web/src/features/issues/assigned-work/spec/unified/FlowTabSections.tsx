"use client";

import type { ReactNode } from "react";
import { HistorySkeleton, PlanSkeleton } from "./FlowSkeletons";
import { ACTIVE_RUN_STATES } from "./flowStages";
import { ownsStep, type FlowTab } from "./flowTabs";
import type { FlowView } from "./flowView";
import { PackageReview } from "./PackageReview";
import { PlanEditor } from "./PlanEditor";
import { ReaderPlan } from "./ReaderPlan";
import { RunHistory } from "./RunHistory";

type Props = { tab: FlowTab; view: FlowView };
const PLAN_TITLE = "Ações da etapa";
const DOCUMENTS_TITLE = "Documentos";
const HISTORY_TITLE = "Histórico de execuções";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section aria-label={title} className="space-y-3 border-t border-line pt-6 first:border-t-0 first:pt-0"><h3 className="text-[15px] font-semibold">{title}</h3>{children}</section>;
}

function PlanSlot({ pending, children }: { pending: boolean; children: ReactNode }) {
  if (children) return <div className="row-strike">{children}</div>;
  return pending ? <PlanSkeleton /> : null;
}

function PlanSection({ tab, view }: Props) {
  const { data, commands, draft } = view;
  const plan = data.overview?.plan ?? null;
  if (!view.canAct) return <Section title={PLAN_TITLE}><ReaderPlan plan={plan} tab={tab} /></Section>;
  return <Section title={PLAN_TITLE}><PlanSlot pending={!data.failed}>{data.options && <PlanEditor plan={plan} options={data.options} commands={commands} state={draft} tab={tab} />}</PlanSlot></Section>;
}

function DocumentsSection({ tab, view }: Props) {
  const { data, commands } = view;
  const packages = data.overview?.packages.filter((item) => item.format === tab.format) ?? [];
  const generating = data.runs?.items.some((run) => ownsStep(tab, run) && ACTIVE_RUN_STATES.includes(run.state)) ?? false;
  return <Section title={DOCUMENTS_TITLE}><PackageReview target={view.target} packages={packages} generating={generating} canAct={view.canAct} busy={commands.busy} onApprove={(input) => void commands.approvePackage(input)} /></Section>;
}

function HistorySection({ tab, view }: Props) {
  const { runs, failed, loadingMore, loadMore } = view.data;
  if (!runs) return failed ? null : <Section title={HISTORY_TITLE}><HistorySkeleton /></Section>;
  const own = runs.items.filter((run) => ownsStep(tab, run));
  return <Section title={HISTORY_TITLE}><RunHistory runs={own} hasMore={runs.nextCursor !== null} loadingMore={loadingMore} onLoadMore={() => void loadMore()} /></Section>;
}

export function FlowTabSections({ tab, view, documentsFirst, waiting }: Props & { documentsFirst: boolean; waiting: boolean }) {
  const { overview, runs } = view.data;
  const hasPackages = overview?.packages.some((item) => item.format === tab.format) ?? false;
  const hasRuns = runs?.items.some((run) => ownsStep(tab, run)) ?? false;
  const plan = <PlanSection key="plan" tab={tab} view={view} />;
  const documents = tab.format && (!waiting || hasPackages) ? <DocumentsSection key="documents" tab={tab} view={view} /> : null;
  return (
    <>
      {documentsFirst ? [documents, plan] : [plan, documents]}
      {(!waiting || hasRuns) && <HistorySection tab={tab} view={view} />}
    </>
  );
}
