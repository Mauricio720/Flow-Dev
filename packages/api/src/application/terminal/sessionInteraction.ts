export const SESSION_RUNTIME_KINDS = ["terminal", "flow_dev"] as const;
export const PERMISSION_MODES = ["bypass", "accept_edits", "ask_all"] as const;
export const MESSAGE_ROLES = ["user", "assistant", "system"] as const;
export const REQUEST_KINDS = ["question", "permission", "file_change", "extra_permission"] as const;
export const REQUEST_STATUSES = ["pending", "answered", "cancelled"] as const;
export const PERMISSION_DECISIONS = ["allow", "allow_session", "allow_always", "deny"] as const;

export type SessionRuntimeKind = (typeof SESSION_RUNTIME_KINDS)[number];
export type PermissionMode = (typeof PERMISSION_MODES)[number];
export type MessageRole = (typeof MESSAGE_ROLES)[number];
export type RequestKind = (typeof REQUEST_KINDS)[number];
export type RequestStatus = (typeof REQUEST_STATUSES)[number];
export type PermissionDecision = (typeof PERMISSION_DECISIONS)[number];
export type PermissionRequestKind = "command" | "file_change" | "extra_permission";
export type AlwaysPermissionScope = "project" | "machine";

export const DEFAULT_PERMISSION_MODE: PermissionMode = "bypass";

export type QuestionOption = { label: string; description: string; preview?: string };
export type Question = { id?: string; question: string; header: string; options: QuestionOption[]; multiSelect: boolean; secret?: boolean; allowOther?: boolean };
export type QuestionPayload = { questions: Question[] };
export type PermissionPayload = { toolName: string; permissionKind?: PermissionRequestKind; title: string; body: string; truncated: boolean; suggestedRule: string | null; suggestions: unknown[]; offers?: PermissionDecision[]; alwaysScope?: AlwaysPermissionScope | null };
export type QuestionAnswerInput = Record<string, { labels: string[]; other?: string }>;
export type PermissionAnswer = { decision: PermissionDecision; reason?: string };
export type RequestPayload = QuestionPayload | PermissionPayload;
