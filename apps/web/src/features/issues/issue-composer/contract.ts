import type { RouterOutputs } from "@flow-dev/api";
import type { SpecLoad, SpecSelection } from "./spec/specContract";

export type TaskPage = RouterOutputs["tasks"]["list"];
export type TaskSummary = TaskPage["items"][number];
export type TaskDetail = RouterOutputs["tasks"]["byId"];
export type TaskMessagePage = RouterOutputs["tasks"]["messages"];
export type TaskMessage = TaskMessagePage["items"][number];
export type TaskRevision = NonNullable<TaskDetail["currentRevision"]>;
export type TaskProposal = NonNullable<TaskDetail["pendingProposal"]>;
export type TaskPublication = NonNullable<TaskDetail["publication"]>;
export type TaskReceipt = RouterOutputs["tasks"]["start"];
export type IssueDraft = TaskRevision["draft"];
export type SourceReference = IssueDraft["references"][number];
export type ToolActivity = TaskDetail["activity"][number];
export type TaskStatus = TaskSummary["status"];
export type PlanningDetail = TaskDetail["planning"];
export type PlanningDecision = NonNullable<PlanningDetail["decision"]>;
export type PlanningOperation = NonNullable<PlanningDetail["operation"]>;
export type PlanningReceipt = RouterOutputs["tasks"]["planning"]["start"];
export type PlanningRoute = PlanningDecision["selectedRoute"];

export type TaskFailure = { code: string | null; reason: string | null; retryAfterSeconds?: number };
export type TaskSnapshot = { detail: TaskDetail; messages: TaskMessage[]; moreMessages: string | null; conversationFailure?: TaskFailure | null };
export type HistoryLoad = { kind: "ready"; page: TaskPage } | { kind: "failed"; failure: TaskFailure };
export type TaskLoad = { kind: "none" } | { kind: "ready"; snapshot: TaskSnapshot } | { kind: "failed"; failure: TaskFailure };
export type WorkspaceLoad = { taskId: string | null; history: HistoryLoad; task: TaskLoad; spec?: SpecLoad; specSelection?: SpecSelection };

export const MAX_MESSAGE_CODE_POINTS = 10_000;
export const MAX_SEARCH_CODE_POINTS = 200;

export function codePoints(text: string) {
  return [...text].length;
}
