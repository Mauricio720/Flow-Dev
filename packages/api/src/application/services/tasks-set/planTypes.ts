import type { AgentChoice } from "../../terminal/sessionAgentCatalog";
import type { TerminalSessionStatus } from "../../terminal/terminalSessionStatus";
import type { ManifestEdge, TaskSet } from "./taskSetTypes";

export type PlanItemState = "ready" | "blocked" | "running" | "ended" | "done";
export type PlanError = "plan_invalid_order" | "plan_task_unknown" | "plan_task_duplicated" | "plan_item_started" | "plan_limits";

export type PlanItemDraft = { id?: string; taskIds: string[]; choice: AgentChoice };

export type StoredPlanItem = {
  id: string;
  position: number;
  taskIds: string[];
  choice: AgentChoice;
  forced: { by: string; at: Date } | null;
  started: boolean;
  latestSession: { id: string; status: TerminalSessionStatus } | null;
};

export type SavedGraph = { nodes: string[]; edges: ManifestEdge[] };

export type StoredPlan = {
  id: string;
  version: number;
  tasksFolder: string;
  manifestVersion: number;
  savedGraph: SavedGraph | null;
  items: StoredPlanItem[];
};

export type PlanValidation = { items: PlanItemDraft[] } | { error: PlanError; message?: string };
export type PlanValidationInput = { set: TaskSet; stored: StoredPlanItem[]; drafts: PlanItemDraft[] };
