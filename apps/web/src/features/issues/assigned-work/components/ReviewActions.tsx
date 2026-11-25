"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { ReviewStage } from "../hooks/useReviewStage";
import type { ReviewAction, ReviewCycleView } from "../reviewContract";
import { ACTION_LABEL, END_REVIEW_LABEL, REVIEW_APPLYING, STOP_CONFIRM_LABEL, STOP_CONFIRM_MESSAGE } from "../reviewCopy";
import { reviewActions } from "../reviewModel";
import { ReviewConfirm } from "./ReviewConfirm";

type Props = { cycle: ReviewCycleView; request: ReviewStage["request"] };

const CONFIRMED_ACTION: ReviewAction = "stop";

export function ReviewActions({ cycle, request }: Props) {
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const actions = reviewActions(cycle);
  const run = async (action: ReviewAction) => {
    setConfirming(false);
    setBusy(true);
    setMessage(await request(cycle.id, cycle.revision, action));
    setBusy(false);
  };
  if (cycle.pendingAction) return <p role="status" className="text-sm text-ink-2">{REVIEW_APPLYING}</p>;
  if (actions.length === 0) return null;
  const labelOf = (action: ReviewAction) => (cycle.state === "failed" && action === CONFIRMED_ACTION ? END_REVIEW_LABEL : ACTION_LABEL[action]);
  const needsConfirm = (action: ReviewAction) => action === CONFIRMED_ACTION && cycle.state !== "failed";
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => <Button key={action} ref={needsConfirm(action) ? trigger : undefined} type="button" variant={action === "retry" || action === "accept" ? "default" : "outline"} disabled={busy} onClick={() => (needsConfirm(action) ? setConfirming(true) : void run(action))}>{labelOf(action)}</Button>)}
      </div>
      {message ? <p role="alert" className="text-sm text-destructive">{message}</p> : null}
      {confirming ? <ReviewConfirm message={STOP_CONFIRM_MESSAGE} confirmLabel={STOP_CONFIRM_LABEL} trigger={trigger} busy={busy} destructive onConfirm={() => void run(CONFIRMED_ACTION)} onCancel={() => setConfirming(false)} /> : null}
    </div>
  );
}
