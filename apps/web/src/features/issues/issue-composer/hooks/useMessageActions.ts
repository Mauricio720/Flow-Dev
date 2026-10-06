"use client";

import { useRef, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import type { TaskFailure, TaskReceipt } from "../contract";
import { createRequestKeys } from "../requestKeys";
import { isUnconfirmed, taskFailure } from "../taskFailure";
import type { ActionContext } from "./actionContext";

export type Submission = { phase: "idle" | "sending" | "unconfirmed" | "not_accepted" } | { phase: "rejected"; failure: TaskFailure };
type SentCommand = { action: "start" | "send"; requestKey: string; message: string };

const IDLE: Submission = { phase: "idle" };

function dispatchCommand(context: ActionContext, sent: SentCommand) {
  const base = { projectId: context.projectId, requestKey: sent.requestKey, message: sent.message };
  if (!context.task) return trpc.tasks.start.mutate(base);
  return trpc.tasks.send.mutate({ ...base, taskId: context.task.id, expectedVersion: context.task.version });
}

function useSubmissionOutcome(context: ActionContext) {
  const [submission, setSubmission] = useState<Submission>(IDLE);
  const [keys] = useState(createRequestKeys);
  const last = useRef<SentCommand | null>(null);
  async function accept(receipt: TaskReceipt, sent: SentCommand) {
    keys.release();
    last.current = null;
    context.input.clear(sent.message);
    setSubmission(IDLE);
    await context.onAccepted(receipt);
  }
  function reject(error: unknown) {
    const failure = taskFailure(error);
    context.onFailure(failure);
    setSubmission(isUnconfirmed(failure) ? { phase: "unconfirmed" } : { phase: "rejected", failure });
  }
  function begin(sent: SentCommand) {
    last.current = sent;
    setSubmission({ phase: "sending" });
  }
  return { submission, setSubmission, keys, lastSent: () => last.current, begin, accept, reject };
}

export function useMessageActions(context: ActionContext) {
  const { submission, setSubmission, keys, lastSent, begin, accept, reject } = useSubmissionOutcome(context);
  async function checkSubmission() {
    const sent = lastSent();
    if (!sent) return;
    try {
      const result = await trpc.tasks.submission.query({ projectId: context.projectId, action: sent.action, requestKey: sent.requestKey });
      if ("status" in result) return setSubmission({ phase: "not_accepted" });
      await accept(result, sent);
    } catch (error) {
      reject(error);
    }
  }
  async function send(message: string) {
    if (submission.phase === "sending") return;
    if (submission.phase === "unconfirmed" && lastSent()?.message === message) return checkSubmission();
    const sent: SentCommand = { action: context.task ? "send" : "start", requestKey: keys.keyFor(`${context.task?.id ?? ""}:${message}`), message };
    begin(sent);
    try {
      await accept(await dispatchCommand(context, sent), sent);
    } catch (error) {
      reject(error);
    }
  }
  return { submission, send, checkSubmission };
}
