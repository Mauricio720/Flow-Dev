import type { RouterInputs, RouterOutputs } from "@flow-dev/api";

export type SessionTimeline = RouterOutputs["tasks"]["session"]["timeline"];
export type TimelineEntry = SessionTimeline["entries"][number];
export type MessageEntry = Extract<TimelineEntry, { type: "message" }>;
export type EventEntry = Extract<TimelineEntry, { type: "event" }>;
export type QuestionEntry = Extract<TimelineEntry, { type: "question" }>;
export type PermissionEntry = Extract<TimelineEntry, { type: "permission" }>;
export type RouteSwitchEntry = Extract<TimelineEntry, { type: "route_switch" }>;
export type RouteSwitchView = RouteSwitchEntry["proposal"];
export type RouteSwitchDecision = RouterInputs["tasks"]["session"]["decideRouteSwitch"]["decision"];
export type RequestEntry = QuestionEntry | PermissionEntry;
export type QuestionItem = QuestionEntry["questions"][number];
export type SessionScope = { projectId: string; taskId: string; sessionId: string };
export type TaskScope = Pick<SessionScope, "projectId" | "taskId">;
export type QuestionAnswers = RouterInputs["tasks"]["session"]["answerQuestion"]["answers"];
export type PermissionDecision = RouterInputs["tasks"]["session"]["decidePermission"]["decision"];
export type ActionResult = string | null;
