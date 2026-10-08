import type { RouterOutputs } from "@flow-dev/api";

export type TaskSummary = RouterOutputs["tasks"]["list"]["items"][number];
export type TaskStatus = TaskSummary["status"];

export type TaskFailure = { code: string | null; reason: string | null; retryAfterSeconds?: number };
