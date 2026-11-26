import type { PlanningDetail } from "../contract";
import { ROUTE_SWITCH_REASONS_LABEL, ROUTE_SWITCH_RECORD_LABEL, switchedRecord } from "../routeSwitchCopy";

type Props = { routeSwitch: PlanningDetail["routeSwitch"] };

export function PlanningRouteSwitchRecord({ routeSwitch }: Props) {
  if (!routeSwitch?.decidedBy || !routeSwitch.decidedAt) return null;
  return (
    <section aria-label={ROUTE_SWITCH_RECORD_LABEL} className="space-y-1.5 border-l-2 border-line pl-3">
      <p className="text-sm font-medium text-ink [overflow-wrap:anywhere]">{switchedRecord(routeSwitch.decidedBy, routeSwitch.decidedAt)}</p>
      <ul aria-label={ROUTE_SWITCH_REASONS_LABEL} className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-ink-2 [overflow-wrap:anywhere]">
        {routeSwitch.reasons.map((reason, index) => <li key={`${index}:${reason}`}>{reason}</li>)}
      </ul>
    </section>
  );
}
