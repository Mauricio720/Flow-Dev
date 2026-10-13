import { DIRECT_ACTION_KIND, type FlowRoute } from "./directExecution";
import type { TaskFlowGate } from "./taskFlowPorts";

type OfferInput = { gate: Pick<TaskFlowGate, "approvedSpec">; taskId: string; plannable: boolean; route?: FlowRoute };

const DIRECT_ROUTE: FlowRoute = "direct";

export async function actionOffers(input: OfferInput) {
  if (input.route === DIRECT_ROUTE) return [{ kind: DIRECT_ACTION_KIND, available: input.plannable }];
  const tasksAvailable = input.plannable && (await input.gate.approvedSpec(input.taskId));
  return [{ kind: "create_spec", available: input.plannable }, { kind: "create_tasks", available: tasksAvailable }];
}
