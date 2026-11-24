import type { PlanItemDraft, StoredPlan } from "../../services/tasks-set/planTypes";

export type SavePlanInput = {
  taskId: string;
  actorId: string;
  version: number;
  tasksFolder: string;
  manifestVersion: number;
  resetItems: boolean;
  items: PlanItemDraft[];
};

export type SavePlanResult = { version: number } | "conflict";
export type ForcedMark = { itemId: string; by: string | null; at: Date | null };

export interface ExecutionPlanDao {
  find(taskId: string): Promise<StoredPlan | null>;
  save(input: SavePlanInput): Promise<SavePlanResult>;
  markForced(input: ForcedMark): Promise<void>;
}
