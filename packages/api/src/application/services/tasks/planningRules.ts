import { createHash } from "node:crypto";
import { PlanningDomainError, planningComplexities, planningRoutes, type PlanningAssessment, type PlanningInput, type PlanningPublicationInput, type PlanningRoute } from "./planningContracts";
import { PLANNING_BODY_MAX_CODE_POINTS, PLANNING_REASONS_MAX, PLANNING_REASON_MAX_CODE_POINTS, PLANNING_REQUEST_MAX_BYTES, PLANNING_SUMMARY_MAX_CODE_POINTS, PLANNING_TITLE_MAX_CODE_POINTS, PLANNING_UNCERTAINTIES_MAX } from "./planningLimits";

const MIN_REASONS = 1;
const MIN_UNCERTAINTIES = 0;

export type PlanningPublicationRecord = PlanningPublicationInput & { outcome: string; taskId: string; repositoryBindingMatches: boolean; issueUrl: string };
type RetainedPublication = PlanningPublicationRecord;
type PlanningCorrelation = { operationId: string; executionId: string; taskId: string };

export function parsePlanningAssessment(value: unknown): PlanningAssessment {
  if (!value || typeof value !== "object" || Array.isArray(value)) return invalidOutput();
  const data = value as Record<string, unknown>;
  const allowed = ["recommendedRoute", "complexity", "summary", "reasons", "uncertainties"];
  if (Object.keys(data).some((key) => !allowed.includes(key)) || allowed.some((key) => !(key in data))) return invalidOutput();
  if (!isRoute(data.recommendedRoute) || !(planningComplexities as readonly string[]).includes(String(data.complexity))) return invalidOutput();
  if (!validText(data.summary, PLANNING_SUMMARY_MAX_CODE_POINTS) || !validTexts(data.reasons, MIN_REASONS, PLANNING_REASONS_MAX) || !validTexts(data.uncertainties, MIN_UNCERTAINTIES, PLANNING_UNCERTAINTIES_MAX)) return invalidOutput();
  return { recommendedRoute: data.recommendedRoute, complexity: data.complexity as PlanningAssessment["complexity"], summary: data.summary as string, reasons: data.reasons as string[], uncertainties: data.uncertainties as string[] };
}

export function planningEligibility(publication: RetainedPublication | null, taskStatus: string) {
  const valid = taskStatus === "published" && publication?.outcome === "created" && publication.repositoryBindingMatches && Boolean(publication.issueId.trim()) && publication.issueNumber > 0 && Boolean(publication.issueUrl?.trim()) && Boolean(publication.title.trim()) && Boolean(publication.bodyMarkdown.trim());
  if (!valid) return { canStart: false, reason: "publication_required" as const };
  try { buildPlanningInput(publication, { operationId: "00000000-0000-4000-8000-000000000001", executionId: "00000000-0000-4000-8000-000000000002", taskId: publication.taskId }); }
  catch (error) { if (error instanceof PlanningDomainError && error.reason === "planning_input_limit") return { canStart: false, reason: error.reason }; throw error; }
  return { canStart: true, reason: null };
}

export function buildPlanningInput(publication: RetainedPublication, correlation: PlanningCorrelation): PlanningInput {
  if (publication.outcome !== "created" || !publication.repositoryBindingMatches || publication.taskId !== correlation.taskId) throw new PlanningDomainError("publication_required");
  const snapshot = publicationFields(publication);
  if (!validText(snapshot.title, PLANNING_TITLE_MAX_CODE_POINTS) || !validText(snapshot.bodyMarkdown, PLANNING_BODY_MAX_CODE_POINTS)) throw new PlanningDomainError("planning_input_limit");
  const content = { taskId: correlation.taskId, publication: snapshot };
  const inputHash = createHash("sha256").update(JSON.stringify(content), "utf8").digest("hex");
  const input = { protocolVersion: 1 as const, ...correlation, inputHash, publication: snapshot };
  if (Buffer.byteLength(JSON.stringify(input), "utf8") > PLANNING_REQUEST_MAX_BYTES) throw new PlanningDomainError("planning_input_limit");
  return input;
}

export function selectionSource(recommended: PlanningRoute, selected: PlanningRoute) { return recommended === selected ? "AI" as const : "HUMAN_OVERRIDE" as const; }
export function planningPayloadHash(input: { taskId: string; requestKey: string; expectedVersion: number; decisionId?: string; expectedDecisionVersion?: number; selectedRoute?: PlanningRoute; reviewedRoute?: PlanningRoute; failedOperationId?: string }) {
  const canonical = { taskId: input.taskId, requestKey: input.requestKey, expectedVersion: input.expectedVersion, decisionId: input.decisionId ?? null, expectedDecisionVersion: input.expectedDecisionVersion ?? null, selectedRoute: input.selectedRoute ?? null, reviewedRoute: input.reviewedRoute ?? null, failedOperationId: input.failedOperationId ?? null };
  return createHash("sha256").update(JSON.stringify(canonical), "utf8").digest("hex");
}
export function assertPlanningReview(savedVersion: number, expectedVersion: number, savedRoute: PlanningRoute, reviewedRoute: PlanningRoute) {
  if (savedVersion !== expectedVersion || savedRoute !== reviewedRoute) throw new PlanningDomainError("planning_conflict");
}

function publicationFields(value: PlanningPublicationInput): PlanningPublicationInput { return { attemptId: value.attemptId, repositoryId: value.repositoryId, repositoryNodeId: value.repositoryNodeId, issueId: value.issueId, issueNumber: value.issueNumber, title: value.title, bodyMarkdown: value.bodyMarkdown }; }
function validTexts(value: unknown, min: number, max: number): value is string[] { return Array.isArray(value) && value.length >= min && value.length <= max && value.every((entry) => validText(entry, PLANNING_REASON_MAX_CODE_POINTS)); }
function validText(value: unknown, max: number): value is string { return typeof value === "string" && Boolean(value.trim()) && Array.from(value).length <= max; }
function isRoute(value: unknown): value is PlanningRoute { return (planningRoutes as readonly unknown[]).includes(value); }
function invalidOutput(): never { throw new PlanningDomainError("planning_invalid_output"); }

export function planningListStatus(taskStatus: string, planningStatus: string | null) {
  if (taskStatus !== "published") return null;
  return (planningStatus ?? "awaiting") as "awaiting" | "in_progress" | "failed" | "review" | "approved";
}
