import type { RouterOutputs } from "@flow-dev/api";

export type CompozyOverview = RouterOutputs["projectCompozy"]["get"];
export type CompozyBinding = RouterOutputs["projectCompozy"]["save"];
export type CompozyHealth = CompozyOverview["compozy"];

export const READY_STATE = "ready";
export const UNREACHABLE: CompozyHealth = { reachable: false, version: null };
