"use client";

import type { PlanningDecision } from "../contract";
import { SpecActivity } from "./SpecActivity";
import { SpecCommandNotice } from "./SpecCommandNotice";
import { SpecInteraction } from "./SpecInteraction";
import { SpecPackageView } from "./SpecPackageView";
import { SpecProgress } from "./SpecProgress";
import { SpecRecoveryActions } from "./SpecRecoveryActions";
import { SpecReviewActions } from "./SpecReviewActions";
import { SpecStartAction } from "./SpecStartAction";
import type { SpecSnapshot } from "./specContract";
import { LOSS_OF_CONTACT, READER_SPEC_NOTE } from "./specCopy";
import type { SpecStageData } from "./useSpecStage";

type Props = { data: SpecStageData; snapshot: SpecSnapshot; decision: PlanningDecision | null; canAct: boolean };

export function SpecStageBody({ data, snapshot, decision, canAct }: Props) {
  const { command, snapshotHook, stage, load, parent, busy } = data;
  const run = (request: Parameters<typeof command.run>[0]) => void command.run(request);
  return (
    <div className="flex flex-col gap-4 px-5 py-4">
      <p role="status" aria-live="polite" className="sr-only">{data.announcement}</p>
      {snapshotHook.contactLost && <p role="status" className="text-sm text-destructive">{LOSS_OF_CONTACT}</p>}
      <SpecProgress snapshot={snapshot} decision={decision} canAct={canAct} onCancel={(attemptId) => run({ action: "spec.cancel", attemptId })} onSelectStage={data.setPicked} onRefresh={() => void snapshotHook.refresh()} />
      {!canAct && <p className="text-sm text-ink-3">{READER_SPEC_NOTE}</p>}
      <SpecCommandNotice hook={command} />
      {canAct && <SpecStartAction snapshot={snapshot} busy={busy} onRequest={run} />}
      {snapshot.pendingInteractions.map((item) => <SpecInteraction key={item.id} interaction={item} canAct={canAct} busy={busy} onSubmit={run} />)}
      <SpecActivity entries={snapshotHook.events.entries} queued={snapshot.attempt?.state === "queued"} target={data.target} hasOlder={snapshotHook.olderCursor !== null} onLoadOlder={() => void snapshotHook.loadOlder()} />
      {stage && <SpecPackageView stage={stage} load={load} parent={parent.detail ? parent : null} onOpenDocument={() => undefined} onLoadMore={(id) => void load.loadMore(id)} />}
      {stage && load.detail && <SpecReviewActions snapshot={snapshot} stage={stage} viewed={load.detail} canAct={canAct} commandBlocked={busy} adjustmentText={data.adjustment} onAdjustmentText={data.setAdjustment} onRequest={run} />}
      {canAct && stage && <SpecRecoveryActions snapshot={snapshot} stage={stage} viewed={load.detail} busy={busy} onRequest={run} />}
    </div>
  );
}
