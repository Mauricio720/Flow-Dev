import type { RuntimeInteraction } from "../../spec/specRuntimeGateway";
import { classifyPermission, type PermissionTarget } from "../../spec/specPermissionBoundary";
import type { SpecStage } from "./specContracts";
import { sha256Hex } from "./specPayload";
import { redactText } from "./specRedaction";
import { isBoundedSpecText } from "./specTextRules";
import { TaskError } from "../tasks/taskErrors";

export type StoredInteraction = { id: string; attemptId: string; stage: SpecStage; kind: string; status: string; description: string; choices: string[] | null; target: PermissionTarget | null; targetDigest: string | null; runtimeTurnId: string; attemptState: string; currentAttemptId: string | null; attemptTurnId: string | null };
export type InteractionDraft = { runtimeInteractionId: string; providerRequestId: string; runtimeSessionId: string; runtimeTurnId: string; kind: "question" | "permission"; description: string; choices: string[] | null; target: PermissionTarget | null; targetDigest: string | null; status: "pending" | "blocked" };
export type AnswerResponse = { choiceIndex?: number; text?: string };

const SHELL_TOOLS = new Set(["bash", "shell", "exec", "run_command", "terminal"]);
const PATH_TOKEN = /[\w./-]+\.[A-Za-z0-9]+|[\w-]+\/[\w./-]+/;
const WAITING_ATTEMPT_STATE = "waiting";
const PENDING_STATUS = "pending";

export function parsePermissionTarget(toolId: string | null, title: string | null): PermissionTarget | null {
  if (!toolId?.trim() || !title?.trim()) return null;
  if (SHELL_TOOLS.has(toolId)) return { tool: toolId, command: title.trim() };
  return { tool: toolId, path: PATH_TOKEN.exec(title)?.[0] };
}

export function permissionTargetDigest(target: PermissionTarget) {
  return sha256Hex(JSON.stringify({ tool: target.tool, path: target.path ?? null, command: target.command ?? null }));
}

export function draftInteraction(runtime: RuntimeInteraction, context: { sessionId: string; workspaceRoot: string | null }): InteractionDraft {
  const description = redactText(runtime.title ?? "", context.workspaceRoot).trim();
  const base = { runtimeInteractionId: runtime.id, providerRequestId: runtime.providerRequestId, runtimeSessionId: context.sessionId, runtimeTurnId: runtime.turnId ?? "" };
  if (runtime.kind === "question") return { ...base, kind: "question", description, choices: runtime.choices.length ? runtime.choices : null, target: null, targetDigest: null, status: description && base.runtimeTurnId ? "pending" : "blocked" };
  const target = parsePermissionTarget(runtime.toolId, description);
  const complete = Boolean(description && target && base.runtimeTurnId);
  return { ...base, kind: "permission", description, choices: null, target: complete ? target : null, targetDigest: complete && target ? permissionTargetDigest(target) : null, status: complete ? "pending" : "blocked" };
}

export function assertInteractionOpen(interaction: StoredInteraction) {
  if (interaction.status === "resolved") throw new TaskError("interaction_resolved");
  if (interaction.status === "superseded") throw new TaskError("interaction_stale");
  const current = interaction.currentAttemptId === interaction.attemptId && interaction.attemptState === WAITING_ATTEMPT_STATE && interaction.attemptTurnId === interaction.runtimeTurnId;
  if (!current) throw new TaskError("interaction_stale");
}

export function validateAnswer(interaction: StoredInteraction, response: AnswerResponse) {
  if (interaction.status !== PENDING_STATUS || interaction.kind !== "question") throw new TaskError("invalid_answer");
  const hasChoice = response.choiceIndex !== undefined;
  if (hasChoice === (response.text !== undefined)) throw new TaskError("invalid_answer");
  if (hasChoice && !(interaction.choices && Number.isInteger(response.choiceIndex) && response.choiceIndex! >= 0 && response.choiceIndex! < interaction.choices.length)) throw new TaskError("invalid_answer");
  if (!hasChoice && !isBoundedSpecText(response.text!)) throw new TaskError("invalid_answer");
}

export function validatePermission(interaction: StoredInteraction, input: { actionDigest: string; decision: "allow_once" | "deny_once" }) {
  if (interaction.status !== PENDING_STATUS || interaction.kind !== "permission" || !interaction.target || !interaction.targetDigest) throw new TaskError("invalid_permission");
  if (interaction.targetDigest !== input.actionDigest) throw new TaskError("invalid_permission");
  if (input.decision === "allow_once" && classifyPermission(interaction.target, { stage: interaction.stage }) !== "in_scope") throw new TaskError("permission_out_of_scope");
}

export function interactionAnswerValue(interaction: StoredInteraction, response: AnswerResponse) {
  return response.choiceIndex !== undefined ? interaction.choices![response.choiceIndex]! : response.text!;
}
