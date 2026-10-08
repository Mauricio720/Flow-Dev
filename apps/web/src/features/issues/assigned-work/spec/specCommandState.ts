import type { SpecFailure, SpecStageName } from "./specContract";

export type SpecRequest =
  | { action: "spec.start"; stage: SpecStageName }
  | { action: "spec.adjust"; stage: SpecStageName; packageId: string; manifestHash: string; text: string }
  | { action: "spec.answer"; attemptId: string; interactionId: string; response: { choiceIndex?: number; text?: string } }
  | { action: "spec.permission"; attemptId: string; interactionId: string; actionDigest: string; decision: "allow_once" | "deny_once" }
  | { action: "spec.cancel"; attemptId: string }
  | { action: "spec.retry"; failedAttemptId: string }
  | { action: "spec.returnToReview"; failedAttemptId: string; packageId: string; manifestHash: string }
  | { action: "spec.approve"; stage: SpecStageName; packageId: string; manifestHash: string };
export type PendingSpecCommand = { requestKey: string; expectedSpecVersion: number; request: SpecRequest };
export type SpecCommandPhase = "idle" | "sending" | "awaiting" | "uncertain" | "resend" | "conflict" | "rejected";
export type SpecCommandState = { phase: SpecCommandPhase; pending: PendingSpecCommand | null; failure: SpecFailure | null };
export type SpecCommandEvent =
  | { type: "begin"; pending: PendingSpecCommand }
  | { type: "accepted"; asynchronous: boolean }
  | { type: "applied" }
  | { type: "unconfirmed" }
  | { type: "not_accepted" }
  | { type: "conflict" }
  | { type: "rejected"; failure: SpecFailure }
  | { type: "reset" };

export const IDLE_SPEC_COMMAND: SpecCommandState = { phase: "idle", pending: null, failure: null };
export const ASYNCHRONOUS_ACTIONS: readonly string[] = ["spec.approve", "spec.returnToReview"];

export function specCommandReducer(state: SpecCommandState, event: SpecCommandEvent): SpecCommandState {
  if (event.type === "begin") return { phase: "sending", pending: event.pending, failure: null };
  if (event.type === "accepted") return event.asynchronous ? { ...state, phase: "awaiting" } : IDLE_SPEC_COMMAND;
  if (event.type === "unconfirmed") return { ...state, phase: "uncertain" };
  if (event.type === "not_accepted") return { ...state, phase: "resend" };
  if (event.type === "conflict") return { phase: "conflict", pending: null, failure: null };
  if (event.type === "rejected") return { phase: "rejected", pending: null, failure: event.failure };
  return IDLE_SPEC_COMMAND;
}

export function sameRequest(left: SpecRequest, right: SpecRequest) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function keyedSpecCommand(state: SpecCommandState, request: SpecRequest, expectedSpecVersion: number): PendingSpecCommand {
  if (state.pending && state.phase !== "idle" && sameRequest(state.pending.request, request)) return state.pending;
  return { requestKey: crypto.randomUUID(), expectedSpecVersion, request };
}

export function blocksSpecCommands(state: SpecCommandState) {
  return ["sending", "awaiting", "uncertain", "resend", "conflict"].includes(state.phase);
}

export function withoutSpecKey(command: PendingSpecCommand) {
  return command.request;
}
