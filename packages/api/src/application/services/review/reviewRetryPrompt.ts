import type { ReviewCycleRecord } from "../../database/dao/reviewCycleDao";
import type { ReviewRole, ReviewVerdict } from "./reviewCycleTypes";
import { caveatsPrompt, executeContinuation, executeInitialPrompt, reviewContinuation, reviewInitialPrompt } from "./reviewPrompts";

const FIRST_ROUND = 1;

export type RetryPromptInput = { cycle: ReviewCycleRecord; role: ReviewRole; reportPath: string | null; verdict: ReviewVerdict | null };

export function retryPrompt(input: RetryPromptInput) {
  const { cycle, role, reportPath, verdict } = input;
  const folder = cycle.tasksFolder;
  if (role === "review") return cycle.round === FIRST_ROUND ? reviewInitialPrompt({ folder, partial: cycle.partial }) : reviewContinuation({ folder, partial: cycle.partial });
  if (verdict === "caveats") return caveatsPrompt({ folder, reportPath: reportPath! });
  return cycle.round === FIRST_ROUND ? executeInitialPrompt({ folder, reportPath: reportPath! }) : executeContinuation({ folder, reportPath: reportPath! });
}
