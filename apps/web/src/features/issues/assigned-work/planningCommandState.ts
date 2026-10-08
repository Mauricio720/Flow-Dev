import type { PlanningRoute, TaskFailure } from "./contract";

export type PlanningAction = "planning.start" | "planning.retry" | "planning.selectRoute" | "planning.approve";
export type ReviewAction = "planning.selectRoute" | "planning.approve";
type CommandBase = { requestKey: string; taskId: string; expectedVersion: number };
export type PendingCommand =
  | (CommandBase & { action: "planning.start" })
  | (CommandBase & { action: "planning.retry"; failedOperationId: string })
  | (CommandBase & { action: ReviewAction; decisionId: string; expectedDecisionVersion: number; route: PlanningRoute });
export type UnkeyedCommand = PendingCommand extends infer Command ? Command extends PendingCommand ? Omit<Command, "requestKey"> : never : never;
export type CommandPhase = "idle" | "sending" | "uncertain" | "resend" | "conflict" | "rejected";
export type CommandState = { phase: CommandPhase; pending: PendingCommand | null; failure: TaskFailure | null; claimedSaved: boolean };
export type CommandEvent =
  | { type: "begin"; pending: PendingCommand }
  | { type: "accepted" }
  | { type: "unconfirmed" }
  | { type: "not_accepted" }
  | { type: "conflict" }
  | { type: "rejected"; failure: TaskFailure }
  | { type: "reviewed" };

export const IDLE_COMMAND: CommandState = { phase: "idle", pending: null, failure: null, claimedSaved: false };

export function commandReducer(state: CommandState, event: CommandEvent): CommandState {
  if (event.type === "begin") return { phase: "sending", pending: event.pending, failure: null, claimedSaved: false };
  if (event.type === "accepted") return { phase: "idle", pending: null, failure: null, claimedSaved: state.pending?.action === "planning.selectRoute" };
  if (event.type === "unconfirmed") return { ...state, phase: "uncertain", claimedSaved: false };
  if (event.type === "not_accepted") return { ...state, phase: "resend", claimedSaved: false };
  if (event.type === "conflict") return { phase: "conflict", pending: null, failure: null, claimedSaved: false };
  if (event.type === "rejected") return { phase: "rejected", pending: null, failure: event.failure, claimedSaved: false };
  return { ...IDLE_COMMAND };
}

export function withoutKey(command: PendingCommand): UnkeyedCommand {
  const copy: Partial<PendingCommand> = { ...command };
  delete copy.requestKey;
  return copy as UnkeyedCommand;
}

export function sameCommand(left: PendingCommand, right: UnkeyedCommand) {
  return JSON.stringify(withoutKey(left)) === JSON.stringify(right);
}

export function keyedCommand(state: CommandState, command: UnkeyedCommand): PendingCommand {
  if (state.pending && state.phase !== "idle" && sameCommand(state.pending, command)) return state.pending;
  return { ...command, requestKey: crypto.randomUUID() } as PendingCommand;
}

export function blocksApproval(state: CommandState) {
  return ["sending", "uncertain", "resend", "conflict"].includes(state.phase);
}
