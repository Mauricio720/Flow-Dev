import type { RouterInputs, RouterOutputs } from "@flow-dev/api";

export type TerminalLastOpened = NonNullable<RouterOutputs["tasks"]["byId"]["terminal"]["lastOpened"]>;

export type TerminalPreflight = RouterOutputs["tasks"]["terminal"]["preflight"];
export type TerminalCheckout = NonNullable<TerminalPreflight["checkout"]>;
export type IssueImageChoice = TerminalPreflight["issueImages"][number];
export type TerminalOpened = RouterOutputs["tasks"]["terminal"]["open"];
export type TerminalScope = { projectId: string; taskId: string };
export type PermissionMode = NonNullable<RouterInputs["tasks"]["terminal"]["open"]["permissionMode"]>;
export type TerminalOpenInput = { prompt: string; requestKey: string; attachmentIds: string[]; issueImageIds: string[]; allowAdditional: boolean; permissionMode: PermissionMode };
export type TerminalExtra = { attachmentIds: string[]; issueImageIds: string[] };
export type TerminalPhase = "loading" | "load_failed" | "ready" | "sending" | "opened";
export type PromptProblem = "empty" | "too_long" | null;
