import type { RouterInputs, RouterOutputs } from "@flow-dev/api";
import type { AgentChoice } from "./terminalContract";

export type PlanView = RouterOutputs["tasks"]["plan"]["get"];
export type PlanItemView = PlanView["items"][number];
export type PlanSaveInput = RouterInputs["tasks"]["plan"]["save"];
export type PlanState = PlanItemView["state"];

export type EditableItem = { key: string; id?: string; taskIds: string[]; choice: AgentChoice; started: boolean };
export type EditablePlan = { version: number; items: EditableItem[] };
export type SelectionTarget = { kind: "item"; key: string; position: number } | { kind: "new" };
export type MoveTarget = { kind: "none" } | { kind: "new" } | { kind: "item"; key: string };
