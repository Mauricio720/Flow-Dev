import { reviewVersionState } from "@flow-dev/api/spec";
import { byteLength } from "./specSource";
import { ADJUST_MAX_BYTES } from "./specCopy";
import type { SpecPackageDetail, SpecSnapshot, SpecStageName } from "./specContract";

export type ReviewActionState = { canApprove: boolean; approveBlocker: string | null; historical: boolean; canAdjust: boolean };
type Input = { snapshot: SpecSnapshot; stage: SpecStageName; viewed: SpecPackageDetail | null; adjustmentText: string; commandBlocked: boolean; canAct: boolean };

export function adjustmentError(text: string) {
  if (!text.trim()) return "Descreva o ajuste desejado.";
  return byteLength(text) > ADJUST_MAX_BYTES ? "O pedido de ajuste excede 16 KiB." : null;
}

export function reviewActionState(input: Input): ReviewActionState {
  const stage = input.snapshot.stages.find((item) => item.stage === input.stage);
  const currentId = stage?.currentPackageId ?? null;
  const viewed = input.viewed;
  const current = viewed && currentId ? { packageId: currentId, manifestHash: currentId === viewed.id ? viewed.manifestHash : "other" } : null;
  const version = viewed ? reviewVersionState({ packageId: viewed.id, manifestHash: viewed.manifestHash }, current) : { historical: false, approvalEnabled: false };
  const unsent = input.adjustmentText.trim().length > 0;
  const reviewable = input.canAct && stage?.state === "review" && version.approvalEnabled && viewed?.captureState === "review_ready";
  return { canApprove: reviewable && !input.commandBlocked && !unsent, approveBlocker: unsent ? "unsent" : null, historical: version.historical, canAdjust: reviewable && !input.commandBlocked };
}
