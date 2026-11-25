"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useReviewStartFlow } from "../hooks/useReviewStartFlow";
import type { ReviewStartInput, ReviewStartOutcome } from "../hooks/useReviewActions";
import type { ReviewGetView } from "../reviewContract";
import { EXECUTOR_FIELD_LABEL, REVIEWER_FIELD_LABEL, REVIEW_ANYWAY_LABEL, START_ANYWAY_LABEL, START_REVIEW_LABEL, missingTasksText, openSessionsConfirmText, partialConfirmText } from "../reviewCopy";
import { AgentChoiceField } from "./AgentChoiceField";
import { ReviewConfirm } from "./ReviewConfirm";

type Props = { view: ReviewGetView; onStart: (input: ReviewStartInput) => Promise<ReviewStartOutcome> };

export function ReviewStartForm({ view, onStart }: Props) {
  const [reviewer, setReviewer] = useState(view.defaults.reviewer);
  const [executor, setExecutor] = useState(view.defaults.executor);
  const flow = useReviewStartFlow(onStart, { reviewer, executor });
  const trigger = useRef<HTMLButtonElement>(null);
  const missing = view.tasks.total - view.tasks.completed;
  const confirm = flow.pending?.kind === "partial" ? { message: partialConfirmText(missing, view.tasks.total), label: REVIEW_ANYWAY_LABEL } : { message: openSessionsConfirmText(flow.pending?.kind === "sessions" ? flow.pending.count : 0), label: START_ANYWAY_LABEL };
  return (
    <div className="space-y-4">
      <fieldset className="space-y-2"><legend className="text-sm font-medium text-ink">{REVIEWER_FIELD_LABEL}</legend><AgentChoiceField compact agents={view.agents} value={reviewer} onChange={setReviewer} /></fieldset>
      <fieldset className="space-y-2"><legend className="text-sm font-medium text-ink">{EXECUTOR_FIELD_LABEL}</legend><AgentChoiceField compact agents={view.agents} value={executor} onChange={setExecutor} /></fieldset>
      {missing > 0 ? <p className="text-sm text-ink-2">{missingTasksText(missing, view.tasks.total)}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button ref={trigger} type="button" disabled={flow.busy || missing > 0} onClick={() => void flow.start()}>{START_REVIEW_LABEL}</Button>
        {missing > 0 ? <Button type="button" variant="outline" disabled={flow.busy} onClick={flow.askPartial}>{REVIEW_ANYWAY_LABEL}</Button> : null}
      </div>
      {flow.failure ? <p role="alert" className="text-sm text-destructive">{flow.failure}</p> : null}
      {flow.pending ? <ReviewConfirm message={confirm.message} confirmLabel={confirm.label} trigger={trigger} onConfirm={() => void flow.confirm()} onCancel={flow.cancel} /> : null}
    </div>
  );
}
