import type { ReviewCycleWorkerDao } from "../src/application/database/dao/reviewCycleWorkerDao";
import type { ReviewRole } from "../src/application/services/review/reviewCycleTypes";
import { DrizzleReviewCycleWorkerDao } from "../src/infra/database/dao/review/drizzleReviewCycleWorkerDao";
import { reviewCycleWorkerWorld } from "./review-cycle-world";

type CycleWorld = Awaited<ReturnType<typeof reviewCycleWorkerWorld>>;
export type SetSessionFault = { role: ReviewRole; mode: "throw" | "lose" };

type SetSessionInput = Parameters<ReviewCycleWorkerDao["setSession"]>[0];
type FaultContext = { target: ReviewCycleWorkerDao; input: SetSessionInput; fault: SetSessionFault; budget: { remaining: number } };

export function faultySetSession(base: ReviewCycleWorkerDao, fault: SetSessionFault): ReviewCycleWorkerDao {
  const budget = { remaining: 1 };
  return new Proxy(base, {
    get(target, key) {
      if (key === "setSession") return (input: SetSessionInput) => setSessionWithFault({ target, input, fault, budget });
      const value = Reflect.get(target, key, target);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

async function setSessionWithFault({ target, input, fault, budget }: FaultContext) {
  if (input.role !== fault.role || budget.remaining === 0) return target.setSession(input);
  budget.remaining -= 1;
  if (fault.mode === "throw") throw new Error("falha simulada depois do launch");
  return null;
}

export function faultyWorker(world: CycleWorld, fault: SetSessionFault) {
  return world.worker.build({ reviewCycles: faultySetSession(new DrizzleReviewCycleWorkerDao(world.setup.database), fault) });
}

export async function tickBuilt(world: CycleWorld, built: ReturnType<typeof faultyWorker>) {
  const drift = Date.now() - world.worker.clock.now().getTime();
  if (drift > 0) world.worker.clock.advance(drift);
  await built.supervisor.tick();
  await built.idle();
  await Promise.all([...world.worker.runtime.runners.values()].map((runner) => runner.settled()));
}
