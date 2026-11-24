import type { RouterOutputs } from "@flow-dev/api";

export type TaskSetView = RouterOutputs["tasks"]["taskSet"]["get"];
export type TaskSetData = NonNullable<TaskSetView["set"]>;
export type TaskItem = TaskSetData["tasks"][number];
export type SpecItem = TaskSetView["specs"][number];
export type TaskStatus = TaskItem["status"];
