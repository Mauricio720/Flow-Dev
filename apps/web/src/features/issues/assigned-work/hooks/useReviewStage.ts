"use client";

import { useCallback, useMemo, useState } from "react";
import { fetchReview } from "../reviewClient";
import type { ReviewGetView } from "../reviewContract";
import { REVIEW_LOAD_FAILED } from "../reviewCopy";
import { reviewIsFinal } from "../reviewModel";
import type { TerminalScope } from "../terminalContract";
import { useReviewActions } from "./useReviewActions";
import { useReviewPolling } from "./useReviewPolling";

function shouldPoll(view: ReviewGetView | null) {
  const cycle = view?.cycle;
  return !cycle || !reviewIsFinal(cycle.state);
}

export function useReviewStage(scope: TerminalScope, enabled = true) {
  const { projectId, taskId } = scope;
  const [view, setView] = useState<ReviewGetView | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const memoScope = useMemo(() => ({ projectId, taskId }), [projectId, taskId]);
  const read = useCallback(async () => {
    try {
      setView(await fetchReview(memoScope));
      setFailure(null);
    } catch {
      setFailure(REVIEW_LOAD_FAILED);
    }
  }, [memoScope]);
  useReviewPolling(enabled && shouldPoll(view), read);
  const { start, request } = useReviewActions(memoScope, read);
  return { view, failure, read, start, request };
}

export type ReviewStage = ReturnType<typeof useReviewStage>;
