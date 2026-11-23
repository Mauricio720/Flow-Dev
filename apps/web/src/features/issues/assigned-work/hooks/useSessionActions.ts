"use client";

import { useState } from "react";
import { trpcData } from "@/lib/trpc/error";
import { answerSessionQuestion, decideSessionPermission, endSession, interruptSession, sendSessionMessage } from "../sessionClient";
import type { ActionResult, PermissionDecision, QuestionAnswers, SessionScope } from "../sessionContract";
import { ACTION_FAILED_MESSAGE } from "../sessionCopy";

export function failureMessage(error: unknown): string {
  const data = trpcData(error);
  const hasReason = Boolean(data && "reason" in data);
  return error instanceof Error && hasReason ? error.message : ACTION_FAILED_MESSAGE;
}

export function useSessionActions(scope: SessionScope) {
  const [busy, setBusy] = useState(false);
  async function run(call: () => Promise<unknown>): Promise<ActionResult> {
    setBusy(true);
    try {
      await call();
      return null;
    } catch (error) {
      return failureMessage(error);
    } finally {
      setBusy(false);
    }
  }
  return {
    busy,
    send: (content: string, requestKey: string) => run(() => sendSessionMessage(scope, { content, requestKey })),
    answer: (requestId: string, answers: QuestionAnswers) => run(() => answerSessionQuestion(scope, { requestId, answers })),
    decide: (requestId: string, decision: PermissionDecision, reason?: string) => run(() => decideSessionPermission(scope, { requestId, decision, reason })),
    interrupt: () => run(() => interruptSession(scope)),
    end: () => run(() => endSession(scope)),
  };
}

export type SessionActions = ReturnType<typeof useSessionActions>;
