"use client";

import { useRef } from "react";
import { requestReviewAction, startReview } from "../reviewClient";
import type { ReviewAction, ReviewStartBody } from "../reviewContract";
import { REVIEW_ACTION_FAILED, REVIEW_START_FAILED } from "../reviewCopy";
import { isReviewChanged, reviewFailureMessage, reviewSessionsOpenCount } from "../reviewFailure";
import type { TerminalScope } from "../terminalContract";

export type ReviewStartOutcome = { kind: "started" } | { kind: "sessions_open"; count: number } | { kind: "failed"; message: string };
export type ReviewStartInput = Omit<ReviewStartBody, "requestKey">;

export function useReviewActions(scope: TerminalScope, read: () => Promise<void>) {
  const requestKey = useRef(crypto.randomUUID());
  const start = async (input: ReviewStartInput): Promise<ReviewStartOutcome> => {
    try {
      await startReview(scope, { ...input, requestKey: requestKey.current });
      requestKey.current = crypto.randomUUID();
      await read();
      return { kind: "started" };
    } catch (error) {
      const count = reviewSessionsOpenCount(error);
      if (count !== null) return { kind: "sessions_open", count };
      if (isReviewChanged(error)) await read();
      return { kind: "failed", message: reviewFailureMessage(error, REVIEW_START_FAILED) };
    }
  };
  const request = async (cycleId: string, revision: number, action: ReviewAction): Promise<string | null> => {
    try {
      await requestReviewAction(scope, { cycleId, revision, action });
      await read();
      return null;
    } catch (error) {
      await read();
      return reviewFailureMessage(error, REVIEW_ACTION_FAILED);
    }
  };
  return { start, request };
}
