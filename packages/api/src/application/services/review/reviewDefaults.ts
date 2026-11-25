import type { ReviewCycleRecord } from "../../database/dao/reviewCycleDao";
import { DEFAULT_SESSION_CHOICE } from "../../terminal/sessionAgentCatalog";

export function reviewDefaults(latest: Pick<ReviewCycleRecord, "reviewer" | "executor"> | null) {
  if (latest) return { reviewer: latest.reviewer, executor: latest.executor };
  return { reviewer: DEFAULT_SESSION_CHOICE, executor: DEFAULT_SESSION_CHOICE };
}
