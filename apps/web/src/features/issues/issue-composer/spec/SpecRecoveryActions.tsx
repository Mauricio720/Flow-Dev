"use client";

import { Button } from "@/components/ui/button";
import type { SpecRequest } from "./specCommandState";
import type { SpecPackageDetail, SpecSnapshot, SpecStageName } from "./specContract";

type Props = { snapshot: SpecSnapshot; stage: SpecStageName; viewed: SpecPackageDetail | null; busy: boolean; onRequest: (request: SpecRequest) => void };
const SETTLED_FAILURES = ["failed", "canceled"];

export function SpecRecoveryActions({ snapshot, stage, viewed, busy, onRequest }: Props) {
  const attempt = snapshot.attempt;
  const row = snapshot.stages.find((item) => item.stage === stage);
  if (!attempt || attempt.stage !== stage || !SETTLED_FAILURES.includes(attempt.state)) return null;
  const restorable = viewed && row?.currentPackageId === viewed.id;
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Recuperação">
      <Button type="button" size="sm" disabled={busy} onClick={() => onRequest({ action: "spec.retry", failedAttemptId: attempt.id })}>Tentar novamente</Button>
      {restorable && <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => onRequest({ action: "spec.returnToReview", failedAttemptId: attempt.id, packageId: viewed.id, manifestHash: viewed.manifestHash })}>Voltar à revisão anterior</Button>}
    </div>
  );
}
