import type { RouterInputs, RouterOutputs } from "@flow-dev/api";
import type { SpecItem } from "./taskSetContract";

export type TerminalLastOpened = NonNullable<RouterOutputs["tasks"]["byId"]["terminal"]["lastOpened"]>;

export type TerminalPreflight = RouterOutputs["tasks"]["terminal"]["preflight"];
export type TerminalCheckout = NonNullable<TerminalPreflight["checkout"]>;
export type IssueImageChoice = TerminalPreflight["issueImages"][number];
export type TerminalOpened = RouterOutputs["tasks"]["terminal"]["open"];
export type TerminalScope = { projectId: string; taskId: string };
export type PermissionMode = NonNullable<RouterInputs["tasks"]["terminal"]["open"]["permissionMode"]>;
export type OpenPurpose = NonNullable<RouterInputs["tasks"]["terminal"]["open"]["purpose"]>;
export type PreviewPurpose = NonNullable<RouterInputs["tasks"]["terminal"]["preflight"]["purpose"]>;
export type AgentChoice = Extract<OpenPurpose, { kind: "generate_tasks" }>["choice"];
export type AgentOption = TerminalPreflight["agents"][number];
export type LaunchPurpose = { kind: "route" } | { kind: "generate_tasks"; specs: SpecItem[] } | { kind: "plan_item"; planItemId: string; force?: boolean };
export type TerminalOpenInput = { prompt: string; requestKey: string; attachmentIds: string[]; issueImageIds: string[]; allowAdditional: boolean; permissionMode: PermissionMode; purpose?: OpenPurpose };
export type TerminalExtra = { attachmentIds: string[]; issueImageIds: string[] };
export type TerminalPhase = "loading" | "load_failed" | "ready" | "sending" | "opened";
export type PromptProblem = "empty" | "too_long" | null;
