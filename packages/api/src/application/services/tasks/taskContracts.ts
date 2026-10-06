import type { TaskLabel } from "../../../schemas/taskLabels";

export type TaskStatus = "generating" | "awaiting_clarification" | "draft_ready" | "generation_failed" | "publishing" | "publication_uncertain" | "published";
export type IssueSource = { type: "project-file" | "github-issue"; path: string | null; line: number | null; repository: string | null; issueNumber: number | null; url: string | null };
export type RelevantContext = { statement: string; source: IssueSource };
export type IssueDraft = { title: string; context: string; objective: string; constraints: string[]; relevantContext: RelevantContext[]; productConsiderations: string[]; references: IssueSource[]; priorityPoints: number | null; labels: TaskLabel[] };
export type TaskSummary = { id: string; projectId: string; authorUserId: string; status: TaskStatus; planningStatus: "awaiting" | "in_progress" | "failed" | "review" | "approved" | null; version: number; title: string; labels: TaskLabel[]; createdAt: string; updatedAt: string };
export type TaskMessage = { id: string; operationId: string | null; sequence: number; role: "user" | "assistant"; kind: "intent" | "clarification" | "refinement" | "result"; content: string; createdAt: string };
export type DraftRevision = { id: string; taskId: string; revisionNumber: number; parentRevisionId: string | null; operationId: string | null; draft: IssueDraft; evidenceBindings: unknown[]; manuallyEditedPaths: string[]; createdAt: string };
export type TaskCommand = { projectId: string; taskId: string; requestKey: string; expectedVersion: number };
export type AcceptedCommand = { taskId: string; operationId: string; acceptedMessageId: string; version: number };
export type TaskToolName = "searchProject" | "readProjectFile" | "searchGitHubIssues" | "getGitHubIssue";
export type TaskToolActivity = { toolCallId: string; operationId: string; tool: TaskToolName; target: string; status: "done" | "empty" | "unavailable"; reason: string | null; durationMs: number; sequence: number };
export type TaskPublication = { issueId: string; issueNumber: number; issueUrl: string; createdAt: Date; title: string; bodyMarkdown: string; repository: string };
