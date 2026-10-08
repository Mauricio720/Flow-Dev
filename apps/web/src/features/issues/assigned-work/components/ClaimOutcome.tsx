import Link from "next/link";
import { projectWorkTaskPath } from "@/lib/navigation/projectRoutes";
import type { ClaimPhase } from "../hooks/useClaim";
import { failureMessage } from "../taskCopy";
import { CLAIM_STATE_LABEL, CLAIM_STATE_NOTE } from "../workCopy";

export function ClaimOutcome({ projectId, phase }: { projectId: string; phase: ClaimPhase }) {
  if (phase.phase === "claiming") return <p role="status" className="text-sm text-ink-2">Reivindicando…</p>;
  if (phase.phase === "rejected") return <p role="alert" className="text-sm text-destructive">{failureMessage(phase.failure)}</p>;
  if (phase.phase !== "settled") return null;
  const { result } = phase;
  return (
    <div role="status" className="space-y-1 text-sm">
      <p className="font-medium">{CLAIM_STATE_LABEL[result.state]}</p>
      <p className="max-w-[60ch] text-ink-2">{result.reason ? failureMessage({ code: null, reason: result.reason }) : CLAIM_STATE_NOTE[result.state]}</p>
      <Link href={projectWorkTaskPath(projectId, result.taskId)} className="inline-block underline">Abrir o trabalho</Link>
    </div>
  );
}
