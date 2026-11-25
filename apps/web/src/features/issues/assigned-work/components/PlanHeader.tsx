import { PLAN_HEADING, sessionCountText } from "../planCopy";

export function PlanHeader({ count }: { count: number }) {
  return (
    <header className="space-y-1">
      <h2 className="text-[15px] font-semibold text-ink">{PLAN_HEADING}</h2>
      <p className="text-sm text-ink-2 tabular-nums">{sessionCountText(count)}</p>
    </header>
  );
}
