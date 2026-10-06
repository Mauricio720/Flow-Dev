"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { SpecRequest } from "./specCommandState";
import type { SpecPackageDetail, SpecSnapshot, SpecStageName } from "./specContract";
import { ADJUST_PLACEHOLDER, HISTORICAL_NOTICE, STAGE_APPROVE_LABEL, UNSENT_ADJUSTMENT_NOTICE } from "./specCopy";
import { adjustmentError, reviewActionState } from "./specActionModel";

type Props = { snapshot: SpecSnapshot; stage: SpecStageName; viewed: SpecPackageDetail; canAct: boolean; commandBlocked: boolean; adjustmentText: string; onAdjustmentText: (text: string) => void; onRequest: (request: SpecRequest) => void };

export function SpecReviewActions({ snapshot, stage, viewed, canAct, commandBlocked, adjustmentText, onAdjustmentText, onRequest }: Props) {
  const state = reviewActionState({ snapshot, stage, viewed, adjustmentText, commandBlocked, canAct });
  const error = adjustmentText ? adjustmentError(adjustmentText) : null;
  const base = { stage, packageId: viewed.id, manifestHash: viewed.manifestHash };
  return (
    <section aria-label="Ações de revisão" className="space-y-3">
      {state.historical && <p role="status" className="text-sm text-clarify-ink">{HISTORICAL_NOTICE}</p>}
      {state.approveBlocker === "unsent" && <p role="status" className="text-sm text-ink-2">{UNSENT_ADJUSTMENT_NOTICE}</p>}
      {canAct && (
        <div className="space-y-2">
          <Textarea aria-label="Pedido de ajuste" placeholder={ADJUST_PLACEHOLDER} value={adjustmentText} onChange={(event) => onAdjustmentText(event.target.value)} />
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" disabled={!state.canAdjust || adjustmentError(adjustmentText) !== null} onClick={() => { onRequest({ action: "spec.adjust", ...base, text: adjustmentText }); onAdjustmentText(""); }}>Pedir ajuste</Button>
            <Button type="button" variant="publish" size="sm" disabled={!state.canApprove} onClick={() => onRequest({ action: "spec.approve", ...base })}>{STAGE_APPROVE_LABEL[stage]}</Button>
          </div>
        </div>
      )}
    </section>
  );
}
