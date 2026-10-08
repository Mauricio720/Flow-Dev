import type { RouterInputs, RouterOutputs } from "@flow-dev/api";

type TaskFlow = RouterOutputs["taskFlow"];

export type FlowOverview = TaskFlow["byTask"];
export type FlowPlan = NonNullable<FlowOverview["plan"]>;
export type FlowAction = FlowPlan["actions"][number];
export type FlowPackage = FlowOverview["packages"][number];
export type FlowOptions = TaskFlow["options"];
export type FlowConnection = FlowOptions["connections"][number];
export type FlowModel = FlowConnection["models"][number];
export type FlowRuns = TaskFlow["runs"];
export type FlowRun = FlowRuns["items"][number];
export type PackageDocuments = TaskFlow["package"];
export type SavePlanInput = RouterInputs["taskFlow"]["savePlan"];
export type PlanActionInput = SavePlanInput["actions"][number];
export type MovableWorkspaceKind = RouterInputs["taskFlow"]["moveAction"]["workspace"]["kind"];
export type RetryRuntimeBindings = NonNullable<RouterInputs["taskFlow"]["retryAction"]["runtimeBindings"]>;

export type FlowLoad = { kind: "ready"; overview: FlowOverview } | { kind: "none" } | { kind: "failed" };
export type FlowTarget = { projectId: string; taskId: string };

export type FlowLoopOption = FlowOptions["loops"][number];
export type FlowWorktreeOption = FlowOptions["worktrees"][number];

export type DocumentLanguage = "pt-BR" | "en";
export type DraftRuntime = { connectionId: string; modelId: string; reasoningEffort: string | null };
export type DraftWorkspace = { kind: "unselected" } | { kind: "isolated" } | { kind: "local" } | { kind: "existing"; worktreeId: string } | { kind: "new"; name: string };
export type DraftLoop = { name: string; version: string; inputs: Record<string, string>; runtimes: Record<string, DraftRuntime | null> };
export type DraftAction = { kind: "create_spec" | "create_tasks" | "loop"; language: DocumentLanguage; runtime: DraftRuntime | null; workspace: DraftWorkspace; loop?: DraftLoop };
