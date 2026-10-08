import { z } from "zod";
import { isValidCursor } from "../application/pagination/cursor";
import { MAX_PLAN_ACTIONS } from "../application/services/task-flow/flowContracts";

const MODEL_ID_MAX = 200;
const EFFORT_MAX = 50;
const WORKTREE_ID_MAX = 200;
const WORKTREE_NAME_MAX = 100;
const LOOP_NAME_MAX = 100;
const LOOP_VERSION_MAX = 50;
const LOOP_INPUT_MAX_BYTES = 16 * 1024;
const ROLE_PATTERN = /^[a-z][a-z0-9_]{0,63}$/;
const documentLanguage = z.enum(["pt-BR", "en"]).default("pt-BR");
export const TASK_FLOW_DEFAULT_PAGE_SIZE = 20;
export const TASK_FLOW_MAX_PAGE_SIZE = 50;

const runtimeChoice = z.object({
  connectionId: z.string().uuid(),
  providerId: z.enum(["codex", "claude"]),
  modelId: z.string().min(1).max(MODEL_ID_MAX),
  reasoningEffort: z.string().min(1).max(EFFORT_MAX).nullable(),
}).strict();

const workspace = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("isolated") }).strict(),
  z.object({ kind: z.literal("local") }).strict(),
  z.object({ kind: z.literal("existing"), worktreeId: z.string().min(1).max(WORKTREE_ID_MAX) }).strict(),
  z.object({ kind: z.literal("new"), name: z.string().trim().min(1).max(WORKTREE_NAME_MAX) }).strict(),
]);

const loopInputs = z.record(z.string(), z.unknown()).refine((value) => JSON.stringify(value).length <= LOOP_INPUT_MAX_BYTES, "inputs_too_large");

const skillAction = z.object({ kind: z.enum(["create_spec", "create_tasks"]), language: documentLanguage, runtime: runtimeChoice, workspace }).strict();
const loopAction = z.object({
  kind: z.literal("loop"),
  loopName: z.string().min(1).max(LOOP_NAME_MAX),
  loopVersion: z.string().min(1).max(LOOP_VERSION_MAX),
  inputs: loopInputs,
  runtimeBindings: z.record(z.string().regex(ROLE_PATTERN), runtimeChoice),
  workspace,
}).strict();

const scope = { projectId: z.string().uuid(), taskId: z.string().uuid() };
const revision = z.number().int().min(0);
const cursor = z.string().max(200).refine(isValidCursor, "Cursor inválido");

export const taskFlowScopeSchema = z.object(scope).strict();
export const taskFlowRunsSchema = z.object({ ...scope, cursor: cursor.optional(), limit: z.number().int().min(1).max(TASK_FLOW_MAX_PAGE_SIZE).optional() }).strict();
export const savePlanSchema = z.object({
  ...scope,
  actions: z.array(z.discriminatedUnion("kind", [skillAction.extend({ kind: z.literal("create_spec") }), skillAction.extend({ kind: z.literal("create_tasks") }), loopAction])).min(1).max(MAX_PLAN_ACTIONS),
  expectedRevision: revision,
  idempotencyKey: z.string().uuid(),
}).strict();
export const startActionSchema = z.object({ ...scope, actionId: z.string().uuid(), expectedRevision: revision, idempotencyKey: z.string().uuid(), preparationId: z.string().uuid().optional() }).strict();
export const prepareLocalActionSchema = z.object({ ...scope, actionId: z.string().uuid(), expectedRevision: revision, requestKey: z.string().uuid(), runtimeBindings: z.record(z.string().regex(ROLE_PATTERN), runtimeChoice).optional() }).strict();
export const localPreparationStatusSchema = z.object({ ...scope, preparationId: z.string().uuid() }).strict();
export const packageScopeSchema = z.object({ ...scope, packageId: z.string().uuid() }).strict();
export const approvePackageSchema = z.object({ ...scope, packageId: z.string().uuid(), version: z.number().int().min(1), idempotencyKey: z.string().uuid() }).strict();
export const cancelRunSchema = z.object({ ...scope, runId: z.string().uuid(), idempotencyKey: z.string().uuid() }).strict();
export const retryActionSchema = startActionSchema.extend({ runtimeBindings: z.record(z.string().regex(ROLE_PATTERN), runtimeChoice).optional() }).strict();
const movableWorkspace = z.discriminatedUnion("kind", [z.object({ kind: z.literal("isolated") }).strict(), z.object({ kind: z.literal("local") }).strict()]);
export const moveActionSchema = z.object({ ...scope, actionId: z.string().uuid(), expectedRevision: revision, workspace: movableWorkspace, runtimeBindings: z.record(z.string().regex(ROLE_PATTERN), runtimeChoice) }).strict();
export const runQuestionsSchema = z.object({ ...scope, runId: z.string().uuid() }).strict();
export const taskFlowGatesSchema = z.object({ ...scope, runId: z.string().uuid(), cursor: cursor.optional(), limit: z.number().int().min(1).max(TASK_FLOW_MAX_PAGE_SIZE).default(TASK_FLOW_DEFAULT_PAGE_SIZE) }).strict();
export const taskFlowEvidenceSchema = z.object({ ...scope, runId: z.string().uuid(), evidenceId: z.string().uuid() }).strict();
export const answerRunQuestionSchema = z.object({
  ...scope, runId: z.string().uuid(), interactionId: z.string().min(1).max(200),
  choiceIndex: z.number().int().min(0).optional(), text: z.string().trim().min(1).max(4000).optional(),
}).strict().refine((value) => (value.choiceIndex === undefined) !== (value.text === undefined), "Informe uma resposta ou escolha");
