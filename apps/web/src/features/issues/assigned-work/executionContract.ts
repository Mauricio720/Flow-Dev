import type { TaskDetail } from "./contract";

export type TaskExecution = TaskDetail["execution"];
export type ExecutionSession = TaskExecution["sessions"][number];
export type ExecutionEvent = ExecutionSession["events"][number];
export type ExecutionAttachment = ExecutionSession["attachments"][number];
export type ExecutionArtifact = TaskExecution["artifacts"][number];
export type TerminalSessionStatus = ExecutionSession["status"];
export type TerminalEventKind = ExecutionEvent["kind"];
