import { trpc } from "@/lib/trpc/client";
import type { PendingSpecCommand } from "./specCommandState";
import type { SpecTarget } from "./specReads";

export function dispatchSpec(target: SpecTarget, pending: PendingSpecCommand) {
  const base = { ...target, requestKey: pending.requestKey, expectedSpecVersion: pending.expectedSpecVersion };
  const { request } = pending;
  if (request.action === "spec.start") return trpc.taskSpec.start.mutate({ ...base, stage: request.stage });
  if (request.action === "spec.adjust") return trpc.taskSpec.adjust.mutate({ ...base, stage: request.stage, packageId: request.packageId, manifestHash: request.manifestHash, text: request.text });
  if (request.action === "spec.answer") return trpc.taskSpec.answer.mutate({ ...base, attemptId: request.attemptId, interactionId: request.interactionId, response: request.response });
  if (request.action === "spec.permission") return trpc.taskSpec.permission.mutate({ ...base, attemptId: request.attemptId, interactionId: request.interactionId, actionDigest: request.actionDigest, decision: request.decision });
  if (request.action === "spec.cancel") return trpc.taskSpec.cancel.mutate({ ...base, attemptId: request.attemptId });
  if (request.action === "spec.retry") return trpc.taskSpec.retry.mutate({ ...base, failedAttemptId: request.failedAttemptId });
  if (request.action === "spec.returnToReview") return trpc.taskSpec.returnToReview.mutate({ ...base, failedAttemptId: request.failedAttemptId, packageId: request.packageId, manifestHash: request.manifestHash });
  return trpc.taskSpec.approve.mutate({ ...base, stage: request.stage, packageId: request.packageId, manifestHash: request.manifestHash });
}

export function observeSpecSubmission(target: SpecTarget, pending: PendingSpecCommand) {
  return trpc.taskSpec.submission.query({ ...target, action: pending.request.action, requestKey: pending.requestKey });
}
