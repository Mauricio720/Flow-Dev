import { trpc } from "@/lib/trpc/client";
import type { ReviewRequestBody, ReviewStartBody } from "./reviewContract";
import type { TerminalScope } from "./terminalContract";

export function fetchReview(scope: TerminalScope) {
  return trpc.tasks.review.get.query(scope);
}

export function startReview(scope: TerminalScope, body: ReviewStartBody) {
  return trpc.tasks.review.start.mutate({ ...scope, ...body });
}

export function requestReviewAction(scope: TerminalScope, body: ReviewRequestBody) {
  return trpc.tasks.review.request.mutate({ ...scope, ...body });
}
