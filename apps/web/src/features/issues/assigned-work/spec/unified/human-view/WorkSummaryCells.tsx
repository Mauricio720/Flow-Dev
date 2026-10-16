import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { FlowStage } from "../flowStages";
import { NOW_COPY, READER_STATE_LABELS, STAGE_LABELS, STAGE_STATE_LABELS } from "../stageCopy";
import type { ViewTarget } from "./humanViewNav";
import { NEXT_STEP_ID } from "./NextStepNote";
import { InlineText } from "./OverviewText";
import type { ArtifactView } from "./viewTypes";
import { impactLabel, NOT_SPECIFIED_SHORT, WORK_SUMMARY_CELLS, WORK_SUMMARY_CTA, WORK_SUMMARY_STATUS } from "./workSummaryCopy";

export type SummaryStatus = { turn: FlowStage; canAct: boolean; documentLabel: string };
type Props = { view: ArtifactView; status: SummaryStatus; onOpen: (target: ViewTarget) => void };

function Cell({ title, children }: { title: string; children: ReactNode }) {
  return <div className="space-y-1.5 px-5 py-4"><h3 className="text-xs font-medium text-ink-3">{title}</h3>{children}</div>;
}

function Text({ text }: { text: string | null }) {
  return text ? <p className="text-sm leading-6 text-ink"><InlineText text={text} /></p> : <p className="text-sm text-ink-3">{NOT_SPECIFIED_SHORT}</p>;
}

function StatusCell({ status, onOpen }: Pick<Props, "status" | "onOpen">) {
  const { turn, canAct } = status;
  const reviewing = canAct && turn.key === "spec_review";
  const next = NOW_COPY[turn.key]?.[turn.state]?.title;
  const rows: [string, string][] = [[WORK_SUMMARY_STATUS.stage, `${STAGE_LABELS[turn.key].label} · ${(canAct ? STAGE_STATE_LABELS : READER_STATE_LABELS)[turn.state]}`], [WORK_SUMMARY_STATUS.document, status.documentLabel], ...(next ? [[WORK_SUMMARY_STATUS.next, next] as [string, string]] : [])];
  return (
    <Cell title={WORK_SUMMARY_CELLS.status}>
      <dl className="space-y-1 text-sm leading-6">{rows.map(([label, value]) => <div key={label} className="flex flex-wrap gap-x-2"><dt className="text-ink-3">{label}:</dt><dd className="text-ink">{value}</dd></div>)}</dl>
      <Button type="button" size="sm" variant={reviewing ? "default" : "outline"} className="mt-2" onClick={() => onOpen(reviewing ? { mode: "overview", itemId: NEXT_STEP_ID } : { mode: "product" })}>{reviewing ? WORK_SUMMARY_CTA.review : WORK_SUMMARY_CTA.product}</Button>
    </Cell>
  );
}

export function WorkSummaryCells({ view, status, onOpen }: Props) {
  const { overview, technical } = view;
  return (
    <div className="grid divide-line max-sm:divide-y sm:grid-cols-2 sm:[&>*:nth-child(-n+2)]:border-b sm:[&>*:nth-child(-n+2)]:border-line sm:[&>*:nth-child(odd)]:border-r sm:[&>*:nth-child(odd)]:border-line">
      <Cell title={WORK_SUMMARY_CELLS.what}><Text text={overview.what?.text ?? null} /></Cell>
      <Cell title={WORK_SUMMARY_CELLS.why}><Text text={overview.why?.text ?? null} /></Cell>
      <Cell title={WORK_SUMMARY_CELLS.impact}>
        {technical.impacts.length > 0 || overview.files ? <button type="button" onClick={() => onOpen({ mode: "technical", section: "impact" })} className="rounded-sm text-left text-sm leading-6 text-ink underline decoration-line underline-offset-4 hover:decoration-ink">{impactLabel(technical.impacts.length, overview.files?.count ?? null)}</button> : <p className="text-sm text-ink-3">{NOT_SPECIFIED_SHORT}</p>}
        {view.product.personas.length > 0 && <p className="text-xs leading-5 text-ink-3">{view.product.personas.map((persona) => persona.title).join(" · ")}</p>}
      </Cell>
      <StatusCell status={status} onOpen={onOpen} />
    </div>
  );
}
