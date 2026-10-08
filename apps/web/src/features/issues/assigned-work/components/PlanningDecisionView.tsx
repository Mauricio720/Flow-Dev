import type { PlanningDecision } from "../contract";
import { COMPLEXITY_LABEL, NO_UNCERTAINTIES, OVERRIDE_NOTE, PLANNING_PROVIDER, ROUTE_LABEL, ROUTE_NEXT_NOTE, SNAPSHOT_BASIS, SOURCE_LABEL } from "../planningCopy";
import { formatMoment } from "@/lib/tasks/formatMoment";

type Props = { decision: PlanningDecision };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs font-medium text-ink-3">{label}</dt>
      <dd className="text-[15px] font-medium text-ink [overflow-wrap:anywhere]">{children}</dd>
    </div>
  );
}

function TextList({ label, items, empty }: { label: string; items: string[]; empty?: string }) {
  return (
    <section aria-label={label} className="space-y-1.5">
      <h4 className="text-xs font-medium text-ink-3">{label}</h4>
      {items.length === 0 && empty ? <p className="text-sm text-ink-2">{empty}</p> : (
        <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-ink [overflow-wrap:anywhere]">{items.map((item, index) => <li key={`${index}:${item}`}>{item}</li>)}</ul>
      )}
    </section>
  );
}

function ApprovalLine({ decision }: Props) {
  if (decision.status !== "approved") return <p className="text-sm text-ink-2">Aguardando a aprovação da pessoa operadora.</p>;
  const when = decision.approvedAt;
  return <p className="text-sm text-merge-ink">Aprovado pela pessoa operadora{when && <> em <time dateTime={when} suppressHydrationWarning>{formatMoment(when)}</time></>}. {ROUTE_NEXT_NOTE}</p>;
}

export function PlanningDecisionView({ decision }: Props) {
  const overridden = decision.decisionSource === "HUMAN_OVERRIDE";
  return (
    <article aria-label="Decisão de planejamento" className="space-y-4">
      <dl className="grid gap-x-6 gap-y-3 border-b border-line pb-4 sm:grid-cols-2">
        <Field label="Analisado por">{PLANNING_PROVIDER}</Field>
        <Field label="Complexidade">{COMPLEXITY_LABEL[decision.complexity]}</Field>
        <Field label="Recomendação original">{ROUTE_LABEL[decision.recommendedRoute]}</Field>
        <Field label="Rota salva">{ROUTE_LABEL[decision.selectedRoute]} · {SOURCE_LABEL[decision.decisionSource]}</Field>
      </dl>
      <p className="text-[15px] leading-relaxed text-ink [overflow-wrap:anywhere]">{decision.summary}</p>
      {overridden && <p className="text-xs text-ink-3">{OVERRIDE_NOTE}</p>}
      <TextList label="Motivos da recomendação" items={decision.reasons} />
      <TextList label="Pendências informadas" items={decision.uncertainties} empty={NO_UNCERTAINTIES} />
      <p className="text-xs text-ink-3">{SNAPSHOT_BASIS}</p>
      <ApprovalLine decision={decision} />
    </article>
  );
}
