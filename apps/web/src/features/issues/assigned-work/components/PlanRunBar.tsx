import { Button } from "@/components/ui/button";
import type { PlanRunControls } from "../hooks/usePlanRun";
import type { PlanView } from "../planContract";
import { PAUSE_RUN_LABEL, RESUME_RUN_LABEL, RUN_PLAN_LABEL, RUN_REGION_LABEL } from "../planRunCopy";
import { canRunPlan, runStatusText } from "../planRunModel";

type Props = { view: PlanView; dirty: boolean; canEdit: boolean; controls: PlanRunControls };

export function PlanRunBar({ view, dirty, canEdit, controls }: Props) {
  const status = runStatusText(view);
  const state = view.run?.state;
  const showRun = canEdit && canRunPlan(view, dirty);
  if (!status && !showRun && !controls.failure) return null;
  return (
    <section aria-label={RUN_REGION_LABEL} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3">
      {status ? <p role="status" className="text-sm font-medium text-ink">{status}</p> : null}
      {controls.failure ? <p role="alert" className="text-sm text-destructive">{controls.failure}</p> : null}
      {canEdit ? (
        <div className="ml-auto flex flex-wrap gap-2">
          {showRun ? <Button type="button" size="sm" disabled={controls.busy} onClick={() => void controls.start()}>{RUN_PLAN_LABEL}</Button> : null}
          {state === "running" ? <Button type="button" size="sm" variant="secondary" disabled={controls.busy} onClick={() => void controls.pause()}>{PAUSE_RUN_LABEL}</Button> : null}
          {state === "paused" ? <Button type="button" size="sm" disabled={controls.busy} onClick={() => void controls.resume()}>{RESUME_RUN_LABEL}</Button> : null}
        </div>
      ) : null}
    </section>
  );
}
