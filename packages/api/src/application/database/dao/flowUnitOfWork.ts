import type { SoftwareDao } from "./softwareDao";
import type { TaskFlowDao } from "./taskFlowDao";

export type FlowTransaction = { flow: TaskFlowDao; software: SoftwareDao };

export interface FlowUnitOfWork {
  run<T>(callback: (transaction: FlowTransaction) => Promise<T>): Promise<T>;
}
