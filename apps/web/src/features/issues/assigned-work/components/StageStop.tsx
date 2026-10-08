import type { StageTabState } from "../stageTabs";
import { Stop } from "./PlanningTimeline";

export function StageStop({ state }: { state: StageTabState }) {
  if (state === "yours") return <span aria-hidden="true" className="relative z-10 block size-5 shrink-0 rounded-full border-[3px] border-clarify bg-raised" />;
  return <Stop state={state} />;
}
