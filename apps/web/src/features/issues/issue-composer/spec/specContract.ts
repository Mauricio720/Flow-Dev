import type { RouterOutputs } from "@flow-dev/api";

export type SpecSnapshot = RouterOutputs["taskSpec"]["byTask"];
export type SpecEventsPage = RouterOutputs["taskSpec"]["events"];
export type SpecEventRecord = SpecEventsPage["items"][number];
export type SpecEventDetail = RouterOutputs["taskSpec"]["event"];
export type SpecPackageList = RouterOutputs["taskSpec"]["packages"];
export type SpecPackageDetail = RouterOutputs["taskSpec"]["package"];
export type SpecDocumentPage = RouterOutputs["taskSpec"]["document"];
export type SpecReceipt = RouterOutputs["taskSpec"]["start"];
export type SpecInteractionItem = SpecSnapshot["pendingInteractions"][number];
export type SpecStageSummary = SpecSnapshot["stages"][number];
export type SpecStageName = "prd" | "tech_spec" | "tasks";
export type SpecFailure = { code: string | null; reason: string | null; retryAfterSeconds?: number };
export type SpecLoad = { kind: "ready"; snapshot: SpecSnapshot } | { kind: "failed"; failure: SpecFailure } | { kind: "none" };
export type SpecSelection = { stage: SpecStageName | null; packageId: string | null; documentId: string | null };
