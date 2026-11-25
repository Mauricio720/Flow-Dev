import type { ScriptStep } from "../src/infra/terminal/scriptedSessionSteps";
import type { WorkerOverrides } from "../src/infra/sessionWorkerComposition";
import { reviewCycleContext, reviewInput, seedReviewTasks } from "./review-cycle-support";
import { workerWorld } from "./session-worker-support";

const REVIEW_SCRIPT: ScriptStep[] = [{ kind: "wait_message" }];
const TEST_TOOLS = { has: async () => true };

export async function reviewCycleWorkerWorld(reviewScript: ScriptStep[] = REVIEW_SCRIPT, executeScript: ScriptStep[] = REVIEW_SCRIPT, overrides: Partial<WorkerOverrides> = {}) {
  const script = (input: { purpose: string }) => input.purpose === "review" ? reviewScript : executeScript;
  const worker = await workerWorld({ script }, { tools: TEST_TOOLS, ...overrides });
  const world = await reviewCycleContext(worker);
  await seedReviewTasks(world);
  const reviewCycle = await world.service.start(reviewInput(world));
  return { ...world, worker, reviewCycle };
}
