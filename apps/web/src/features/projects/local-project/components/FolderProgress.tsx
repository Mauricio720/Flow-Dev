import { CheckIcon } from "@/components/icons";
import type { FolderPhase } from "../hooks/useFolderLink";
import { FOLDER_PROGRESS, FOLDER_STEP_LABEL, FOLDER_STEPS_LABEL } from "../localProjectCopy";

type ActivePhase = Exclude<FolderPhase, "idle">;
type StepState = "done" | "current" | "pending";

const PHASES: ActivePhase[] = ["requesting", "pending", "claimed"];
const STOP_FRAME = "relative z-10 grid size-5 shrink-0 place-items-center rounded-full";
const LABEL_INK: Record<StepState, string> = { done: "text-ink-2", current: "font-semibold text-ink", pending: "text-ink-3" };

function stateOf(index: number, current: number): StepState {
  if (index < current) return "done";
  return index === current ? "current" : "pending";
}

function Stop({ state }: { state: StepState }) {
  if (state === "done") return <span aria-hidden="true" className={`${STOP_FRAME} bg-merge text-ground`}><CheckIcon size={12} strokeWidth={3} /></span>;
  if (state === "current") return <span aria-hidden="true" className={`${STOP_FRAME} border-2 border-ink bg-raised`}><span className="node-running size-2 rounded-full bg-ink" /></span>;
  return <span aria-hidden="true" className={`${STOP_FRAME} border-2 border-dashed border-ink-3 bg-raised`} />;
}

export function FolderProgress({ phase }: { phase: ActivePhase }) {
  const current = PHASES.indexOf(phase);
  return (
    <div className="row-strike max-w-[65ch] space-y-3 rounded-xl border border-line bg-raised px-5 py-4">
      <ol aria-label={FOLDER_STEPS_LABEL}>
        {PHASES.map((step, index) => {
          const state = stateOf(index, current);
          return (
            <li key={step} aria-current={state === "current" ? "step" : undefined} className="relative flex items-center gap-3 pb-3 last:pb-0">
              {index < PHASES.length - 1 && <span aria-hidden="true" className={`absolute top-5 bottom-0 left-[9px] border-l-2 ${state === "done" ? "border-merge" : "border-dashed border-ink-3"}`} />}
              <Stop state={state} />
              <span className={`text-sm leading-snug ${LABEL_INK[state]}`}>{FOLDER_STEP_LABEL[step]}</span>
            </li>
          );
        })}
      </ol>
      <p role="status" className="border-t border-line pt-3 text-sm text-ink-2">{FOLDER_PROGRESS[phase]}</p>
    </div>
  );
}
