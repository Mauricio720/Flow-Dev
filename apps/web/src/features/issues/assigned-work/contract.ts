import type { RouterOutputs } from "@flow-dev/api";
import type { TaskFailure } from "@/lib/tasks/contract";
import type { SpecLoad, SpecSelection } from "./spec/specContract";
import type { FlowLoad } from "./spec/unified/unifiedContract";

export type { TaskFailure };
export type TaskDetail = RouterOutputs["tasks"]["byId"];
export type TaskSummary = TaskDetail["task"];
export type TaskStatus = TaskSummary["status"];
export type TaskReceipt = RouterOutputs["tasks"]["start"];
export type PlanningDetail = TaskDetail["planning"];
export type PlanningDecision = NonNullable<PlanningDetail["decision"]>;
export type PlanningOperation = NonNullable<PlanningDetail["operation"]>;
export type PlanningReceipt = RouterOutputs["tasks"]["planning"]["start"];
export type PlanningRoute = PlanningDecision["selectedRoute"];

export type QueuePage = RouterOutputs["assignedIssues"]["list"];
export type QueueItem = QueuePage["items"][number];
export type ActivePage = RouterOutputs["assignedIssues"]["active"];
export type ActiveItem = ActivePage["items"][number];
export type WorkView = RouterOutputs["assignedIssues"]["byTask"];
export type ClaimResult = RouterOutputs["assignedIssues"]["claim"];
export type ActiveFilter = "mine" | "shared";

export type QueueLoad = { kind: "ready"; page: QueuePage } | { kind: "failed"; failure: TaskFailure };
export type ActiveLoad = { kind: "ready"; page: ActivePage } | { kind: "failed"; failure: TaskFailure };
export type WorkListLoad = { queue: QueueLoad; active: ActiveLoad };

export type WorkSnapshot = { view: WorkView; detail: TaskDetail };
export type WorkLoad = { kind: "ready"; snapshot: WorkSnapshot } | { kind: "failed"; failure: TaskFailure };
export type WorkDetailLoad = { taskId: string; work: WorkLoad; spec: SpecLoad; specSelection: SpecSelection; flow: FlowLoad };
