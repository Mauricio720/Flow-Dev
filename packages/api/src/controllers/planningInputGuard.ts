import { parsePlanningBaseUrl } from "../application/planning/planningConfiguration";
import { TaskError } from "../application/services/tasks/taskErrors";

export function requirePlanningConfiguration(env: Record<string, string | undefined> = process.env) {
  parsePlanningBaseUrl(env.PLANNING_BASE_URL);
  if (!env.PLANNING_API_KEY) throw new TaskError("planning_unconfigured");
}
