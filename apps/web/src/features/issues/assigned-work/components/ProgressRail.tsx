import { CheckIcon, XIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import { STATE_TONE } from "../progressTone";
import type { StageState } from "../spec/unified/flowStages";
import { STAGE_STATE_LABELS } from "../spec/unified/stageCopy";
import type { ProgressStage } from "../workProgress";

const STOP_FRAME = "relative z-10 flex size-4 shrink-0 items-center justify-center rounded-full";

function RailStop({ state }: { state: StageState }) {
  if (state === "done") return <span aria-hidden="true" className={cn(STOP_FRAME, "bg-merge text-ground")}><CheckIcon size={10} strokeWidth={3} /></span>;
  if (state === "failed") return <span aria-hidden="true" className={cn(STOP_FRAME, "border-2 border-destructive bg-raised text-destructive")}><XIcon size={8} strokeWidth={3} /></span>;
  if (state === "current") return <span aria-hidden="true" className={cn(STOP_FRAME, "border-2 border-project bg-project-wash")}><span className="node-running size-1.5 rounded-full bg-project" /></span>;
  if (state === "yours") return <span aria-hidden="true" className={cn(STOP_FRAME, "border-[3px] border-clarify bg-raised")} />;
  return <span aria-hidden="true" className={cn(STOP_FRAME, "border-2 border-dashed border-ink-3 bg-raised")} />;
}

function connectorTone(previous: ProgressStage, stage: ProgressStage) {
  return previous.state === "done" && stage.state !== "pending" ? "bg-merge" : "bg-line";
}

export function ProgressRail({ rail }: { rail: ProgressStage[] }) {
  return (
    <ol aria-label="Etapas do fluxo" className="grid auto-cols-fr grid-flow-col">
      {rail.map((stage, index) => (
        <li key={stage.key} className="relative flex flex-col items-center gap-1.5 text-center">
          {index > 0 && <span aria-hidden="true" className={cn("absolute top-[7px] right-1/2 h-0.5 w-full", connectorTone(rail[index - 1]!, stage))} />}
          <RailStop state={stage.state} />
          <span className={cn("text-[11px] leading-tight max-sm:sr-only", stage.state === "pending" ? "text-ink-3" : cn("font-medium", STATE_TONE[stage.state].label))}>{stage.label}</span>
          <span className="sr-only">: {STAGE_STATE_LABELS[stage.state]}</span>
        </li>
      ))}
    </ol>
  );
}
