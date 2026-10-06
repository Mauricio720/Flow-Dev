import type { SpecReceipt } from "../application/services/spec/specContracts";

type CommandLog = { event: string; action: string; input: { projectId: string; taskId: string; requestKey: string }; receipt: SpecReceipt };

export function logSpecCommand({ event, action, input, receipt }: CommandLog) {
  console.info(JSON.stringify({ event, action, projectId: input.projectId, taskId: input.taskId, requestKey: input.requestKey, commandId: receipt.commandId, attemptId: receipt.attemptId, specVersion: receipt.specVersion }));
}
