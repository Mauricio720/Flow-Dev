import { DrizzleTaskPlanningWorkerDao } from "../src/infra/database/dao/tasks/drizzleTaskPlanningWorkerDao";
import { TaskPlanningWorkerController } from "../src/controllers/taskPlanningWorkerController";
import { sessions } from "../src/infra/database/schema";
import type { PlanningEnvelope, PlanningGateway } from "../src/application/planning/planningGateway";
import type { PlanningDispatch } from "../src/application/services/tasks/planningContracts";
import type { PlanningSetup } from "./planning-support";

export const ASSESSMENT = { recommendedRoute: "tech_spec", complexity: "medium", summary: "Resumo da análise", reasons: ["Altera contrato"], uncertainties: ["Falta contexto"] };
type Behavior = (input: PlanningDispatch, index: number) => PlanningEnvelope | Promise<PlanningEnvelope>;

export function validEnvelope(input: PlanningDispatch, summary = ASSESSMENT.summary): PlanningEnvelope {
  return { protocolVersion: 1, operationId: input.operationId, executionId: input.executionId, taskId: input.taskId, inputHash: input.inputHash, result: { ...ASSESSMENT, summary } as never };
}

export class FakePlanningGateway implements PlanningGateway {
  readonly calls: PlanningDispatch[] = [];
  constructor(private readonly behavior: Behavior = (input) => validEnvelope(input)) {}

  async analyze(input: PlanningDispatch) {
    this.calls.push(input);
    return this.behavior(input, this.calls.length - 1);
  }
}

export function plannerFor(setup: PlanningSetup, gateway: PlanningGateway | undefined, options: { clock?: () => Date; workerId?: string } = {}) {
  const clock = options.clock ?? (() => new Date());
  const dao = new DrizzleTaskPlanningWorkerDao(setup.database, clock);
  const worker = new TaskPlanningWorkerController(dao, setup.repositoryAccess, gateway ?? new FakePlanningGateway(), options.workerId ?? crypto.randomUUID(), clock);
  return { dao, worker };
}

export async function keepSessionAlive(setup: PlanningSetup) {
  await setup.database.update(sessions).set({ expiresAt: new Date(Date.now() + 86_400_000) });
}

export function movableClock() {
  let current = Date.now();
  return { now: () => new Date(current), advance: (milliseconds: number) => { current += milliseconds; } };
}
