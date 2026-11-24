import { Button } from "@/components/ui/button";
import type { ExecutionPlanState } from "../hooks/useExecutionPlan";
import { RELOAD_LABEL, SAVE_LABEL, SAVING_LABEL, UNSAVED_NOTE } from "../planCopy";

const DIRTY_FRAME = "sticky bottom-4 z-10 border-line bg-raised shadow-raised";
const CLEAN_FRAME = "border-transparent";

export function PlanSaveBar({ state }: { state: ExecutionPlanState }) {
  return (
    <div className={`space-y-2 rounded-xl border px-4 py-3 transition-shadow duration-200 ease-out-expo ${state.dirty ? DIRTY_FRAME : CLEAN_FRAME}`}>
      {state.failure ? <p role="alert" className="text-sm text-destructive">{state.failure}</p> : null}
      <div className="flex flex-wrap items-center justify-end gap-2">
        {state.dirty ? <p className="mr-auto text-sm text-ink-2">{UNSAVED_NOTE}</p> : null}
        {state.dirty ? <Button type="button" variant="ghost" disabled={state.saving} onClick={state.discard}>{RELOAD_LABEL}</Button> : null}
        <Button type="button" disabled={!state.dirty || state.saving} onClick={() => void state.save()}>{state.saving ? SAVING_LABEL : SAVE_LABEL}</Button>
      </div>
    </div>
  );
}
