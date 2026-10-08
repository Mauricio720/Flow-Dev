import { CheckIcon } from "@/components/icons";
import type { PlanningLifecycle } from "../planningModel";

const CAPSULE_TONE: Record<PlanningLifecycle, string> = {
  awaiting: "border-dashed border-ink-3 text-ink-2",
  in_progress: "border-ink bg-ink text-ground",
  review: "border-ink text-ink",
  failed: "border-destructive text-destructive",
  approved: "border-merge bg-merge-wash text-merge-ink",
  unknown: "border-line text-ink-2",
};

function CapsuleMark({ lifecycle }: { lifecycle: PlanningLifecycle }) {
  if (lifecycle === "in_progress") return <span aria-hidden="true" className="node-running size-1.5 rounded-full bg-ground" />;
  if (lifecycle === "approved") return <CheckIcon size={12} strokeWidth={3} />;
  return null;
}

export function PlanningStatusCapsule({ lifecycle, label }: { lifecycle: PlanningLifecycle; label: string }) {
  return (
    <span className={`inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium ${CAPSULE_TONE[lifecycle]}`}>
      <CapsuleMark lifecycle={lifecycle} />
      {label}
    </span>
  );
}
