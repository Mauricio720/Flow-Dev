import type { IssueDraft } from "../services/tasks/taskContracts";
import type { TaskMessage } from "../services/tasks/taskContracts";

export type GenerationInput = { protocolVersion: 1; operationId: string; executionId: string; messages: Array<Pick<TaskMessage, "role" | "content">>; currentDraft: IssueDraft | null; baseRevisionId: string | null; retainedEvidence: unknown[]; contextCapability: string };
export type ToolOutcome = { toolCallId: string; status: "done" | "empty" | "unavailable"; evidenceIds: string[]; durationMs: number; reason?: string };
export type GenerationResult = { status: "needs_clarification"; question: string } | { status: "draft_ready"; draft: IssueDraft };
export type GenerationEnvelope = { protocolVersion: 1; operationId: string; executionId: string; result: GenerationResult; activity: ToolOutcome[] };

export interface IssueAuthorGateway {
  generate(input: GenerationInput): Promise<GenerationEnvelope>;
}
