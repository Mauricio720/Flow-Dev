import type { PermissionPayload, QuestionPayload } from "../../terminal/sessionInteraction";
import type { RuntimePermissionResult } from "../../terminal/claudeSessionRuntime";
import type { SessionRequestRecord } from "../../terminal/sessionInteractionPorts";

export const DENIED_BY_PERSON_MESSAGE = "Recusado pela pessoa";
export const INTERRUPTED_BY_PERSON_MESSAGE = "Interrompido pela pessoa";
const PERSISTENT_DESTINATION = "localSettings";

type StoredPermissionAnswer = { decision: "allow" | "allow_always" | "deny"; reason?: string };
type StoredQuestionAnswer = { answers: Record<string, string | string[]> };

export function denyResult(message: string): RuntimePermissionResult {
  return { behavior: "deny", message };
}

function persistentSuggestions(payload: PermissionPayload) {
  return (payload.suggestions as Array<Record<string, unknown>>).map((suggestion) => ({ ...suggestion, destination: PERSISTENT_DESTINATION }));
}

function permissionResult(request: SessionRequestRecord, answer: StoredPermissionAnswer, originalInput: Record<string, unknown>): RuntimePermissionResult {
  if (answer.decision === "deny") return denyResult(answer.reason || DENIED_BY_PERSON_MESSAGE);
  if (answer.decision === "allow") return { behavior: "allow", updatedInput: originalInput };
  return { behavior: "allow", updatedInput: originalInput, updatedPermissions: persistentSuggestions(request.payload as PermissionPayload) };
}

export function mapAnswerToPermissionResult(request: SessionRequestRecord, answer: unknown, originalInput: Record<string, unknown>): RuntimePermissionResult {
  if (request.kind === "question") {
    const questions = (request.payload as QuestionPayload).questions;
    return { behavior: "allow", updatedInput: { questions, answers: (answer as StoredQuestionAnswer).answers } };
  }
  return permissionResult(request, answer as StoredPermissionAnswer, originalInput);
}
