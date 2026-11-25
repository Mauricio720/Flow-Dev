import type { RouterInputs, RouterOutputs } from "@flow-dev/api";

export type ReviewGetView = RouterOutputs["tasks"]["review"]["get"];
export type ReviewCycleView = NonNullable<ReviewGetView["cycle"]>;
export type ReviewRoundView = ReviewCycleView["rounds"][number];
export type ReviewStep = ReviewCycleView["step"];
export type ReviewState = ReviewCycleView["state"];
export type ReviewAction = NonNullable<ReviewCycleView["pendingAction"]>;
export type ReviewStartInput = RouterInputs["tasks"]["review"]["start"];
export type ReviewRequestInput = RouterInputs["tasks"]["review"]["request"];
export type ReviewStartBody = Omit<ReviewStartInput, "projectId" | "taskId">;
export type ReviewRequestBody = Omit<ReviewRequestInput, "projectId" | "taskId">;
