import { z } from "zod";
import { PlanningDomainError, type PlanningAssessment, type PlanningComplexity, type PlanningRoute } from "../../application/services/tasks/planningContracts";
import { parsePlanningAssessment } from "../../application/services/tasks/planningRules";

export const ISSUE_SOURCE_ID = "issue";
const ROUTES: Record<string, PlanningRoute> = { DIRECT: "direct_execution", TECH_SPEC: "tech_spec", PRD: "prd" };
const COMPLEXITIES: Record<string, PlanningComplexity> = { LOW: "low", MEDIUM: "medium", HIGH: "high" };
const DESCRIPTION_SEPARATOR = " — ";
const BLOCKING_PREFIX = "Bloqueante: ";
const nonBlank = (value: string) => value.trim().length > 0;
const sourceId = z.union([z.literal(ISSUE_SOURCE_ID), z.string().uuid()]);

const reasonSchema = z.strictObject({
  code: z.string().regex(/^[A-Z][A-Z0-9_]{0,63}$/u),
  label: z.string().trim().min(1).max(160),
  description: z.string().max(600).nullable(),
  sourceIds: z.array(sourceId).min(1).max(10).refine((ids) => new Set(ids).size === ids.length),
});

const uncertaintySchema = z.strictObject({ question: z.string().max(400).refine(nonBlank), blocking: z.boolean() });

export const planningOutputSchema = z.strictObject({
  route: z.enum(["DIRECT", "TECH_SPEC", "PRD"]),
  complexity: z.enum(["LOW", "MEDIUM", "HIGH"]),
  summary: z.string().trim().min(1).max(1200),
  reasons: z.array(reasonSchema).min(1).max(8),
  uncertainties: z.array(uncertaintySchema).max(12),
}).superRefine((assessment, context) => {
  if (assessment.route === "DIRECT" && assessment.uncertainties.some((item) => item.blocking)) context.addIssue({ code: "custom", path: ["route"], message: "DIRECT cannot carry a blocking uncertainty." });
});

export type ModelAssessment = z.infer<typeof planningOutputSchema>;

export function planningJsonSchema() {
  return z.toJSONSchema(planningOutputSchema);
}

function reasonText(reason: ModelAssessment["reasons"][number]) {
  const description = reason.description?.trim();
  return description ? reason.label.trim() + DESCRIPTION_SEPARATOR + description : reason.label.trim();
}

function uncertaintyText(uncertainty: ModelAssessment["uncertainties"][number]) {
  const question = uncertainty.question.trim();
  return uncertainty.blocking ? BLOCKING_PREFIX + question : question;
}

export function toFlowAssessment(model: ModelAssessment): PlanningAssessment | null {
  const candidate = { recommendedRoute: ROUTES[model.route], complexity: COMPLEXITIES[model.complexity], summary: model.summary, reasons: model.reasons.map(reasonText), uncertainties: model.uncertainties.map(uncertaintyText) };
  try { return parsePlanningAssessment(candidate); }
  catch (error) { if (error instanceof PlanningDomainError) return null; throw error; }
}

export function parseModelAssessment(value: unknown) {
  const parsed = planningOutputSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
