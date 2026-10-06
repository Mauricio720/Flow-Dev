import type { RouterOutputs } from "@flow-dev/api";

export type TaskSummary = RouterOutputs["tasks"]["list"]["items"][number];
export type TaskStatus = TaskSummary["status"];
