import type { Question } from "../../../terminal/sessionInteraction";
import type { RuntimePermissionRequest, RuntimePermissionResult } from "../../../terminal/agentSessionRuntime";

export type CodexQuestionOption = { label: string; description: string };
export type CodexQuestionInput = { id: string; header: string; question: string; isOther: boolean; isSecret: boolean; options: CodexQuestionOption[] | null };
export type CodexQuestionRequest = { threadId: string; turnId: string; itemId: string; questions: CodexQuestionInput[] };

function mapQuestion(question: CodexQuestionInput): Question {
  return { id: question.id, header: question.header, question: question.question, options: question.options ?? [], multiSelect: false, secret: question.isSecret, allowOther: question.isOther };
}

export function translateCodexQuestion(request: CodexQuestionRequest): RuntimePermissionRequest {
  const questions = request.questions.map(mapQuestion);
  return { toolName: "AskUserQuestion", input: { questions }, toolUseId: request.itemId, suggestions: [] };
}

export function translateCodexQuestionAnswer(result: RuntimePermissionResult) {
  if (result.behavior !== "allow" || !("updatedInput" in result) || !result.updatedInput) return null;
  const answers = result.updatedInput.answers as Record<string, string | string[]> | undefined;
  if (!answers) return null;
  return { answers: Object.fromEntries(Object.entries(answers).map(([id, answer]) => [id, { answers: Array.isArray(answer) ? answer : [answer] }])) };
}
