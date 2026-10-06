import { PLANNING_RESPONSE_MAX_BYTES } from "../../application/services/tasks/planningLimits";
import { PlanningDomainError, type PlanningDispatch } from "../../application/services/tasks/planningContracts";
import { parsePlanningAssessment } from "../../application/services/tasks/planningRules";
import type { PlanningEnvelope } from "../../application/planning/planningGateway";
import { TaskError } from "../../application/services/tasks/taskErrors";
import { toAssessmentCandidate } from "./devControlPlanningAssessment";

const ENVELOPE_KEYS = ["protocolVersion", "operationId", "executionId", "issueRevisionId", "reviewStatus", "result", "activity"];
const PENDING_REVIEW = "pending_review";

export async function readCappedBody(response: Response) {
  if (!response.body) throw new TaskError("planning_invalid_output");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > PLANNING_RESPONSE_MAX_BYTES) { await reader.cancel(); throw new TaskError("planning_invalid_output"); }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

export function parseEnvelope(text: string, input: PlanningDispatch): PlanningEnvelope {
  const value = parseJson(text);
  const keys = Object.keys(value);
  if (keys.length !== ENVELOPE_KEYS.length || ENVELOPE_KEYS.some((key) => !(key in value)) || value.protocolVersion !== 1 || value.reviewStatus !== PENDING_REVIEW) throw new TaskError("planning_invalid_output");
  if (value.operationId !== input.operationId || value.executionId !== input.executionId || value.issueRevisionId !== input.publication.attemptId) throw new TaskError("planning_execution_mismatch");
  return { protocolVersion: 1, operationId: input.operationId, executionId: input.executionId, taskId: input.taskId, inputHash: input.inputHash, result: parseResult(value.result) };
}

function parseJson(text: string): Record<string, unknown> {
  try {
    const value: unknown = JSON.parse(text);
    if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  } catch { throw new TaskError("planning_invalid_output"); }
  throw new TaskError("planning_invalid_output");
}

function parseResult(value: unknown) {
  try { return parsePlanningAssessment(toAssessmentCandidate(value)); }
  catch (error) { if (error instanceof PlanningDomainError) throw new TaskError("planning_invalid_output"); throw error; }
}
