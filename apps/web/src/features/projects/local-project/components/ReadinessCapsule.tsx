import { CheckIcon, XIcon } from "@/components/icons";
import type { LocalReadiness } from "../contract";
import { READINESS_LABEL } from "../localProjectCopy";

const CAPSULE_FRAME = "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium";
const CAPSULE_INK: Record<LocalReadiness, string> = { ready: "border-ink text-ink", blocked: "border-destructive text-destructive", checking: "border-ink bg-ink text-ground" };

function Mark({ readiness }: { readiness: LocalReadiness }) {
  if (readiness === "ready") return <CheckIcon size={12} strokeWidth={3} />;
  if (readiness === "blocked") return <XIcon size={10} strokeWidth={3} />;
  return <span aria-hidden="true" className="node-running size-1.5 rounded-full bg-current" />;
}

export function ReadinessCapsule({ readiness }: { readiness: LocalReadiness }) {
  return <span role="status" className={`${CAPSULE_FRAME} ${CAPSULE_INK[readiness]}`}><Mark readiness={readiness} />{READINESS_LABEL[readiness]}</span>;
}
