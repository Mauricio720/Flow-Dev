import type { PlanningComplexity, PlanningRoute } from "../../application/services/tasks/planningContracts";

const ROUTES: Record<string, PlanningRoute> = { DIRECT: "direct_execution", TECH_SPEC: "tech_spec", PRD: "prd" };
const COMPLEXITIES: Record<string, PlanningComplexity> = { LOW: "low", MEDIUM: "medium", HIGH: "high" };
const DESCRIPTION_SEPARATOR = " — ";
const BLOCKING_PREFIX = "Bloqueante: ";
const UNREADABLE_TEXT = "";

export function toAssessmentCandidate(value: unknown) {
  const result = asRecord(value);
  if (!result) return null;
  return { recommendedRoute: ROUTES[String(result.route)], complexity: COMPLEXITIES[String(result.complexity)], summary: result.summary, reasons: texts(result.reasons, reasonText), uncertainties: texts(result.uncertainties, uncertaintyText) };
}

function texts(value: unknown, read: (entry: Record<string, unknown>) => string) {
  if (!Array.isArray(value)) return null;
  return value.map((entry) => { const record = asRecord(entry); return record ? read(record) : UNREADABLE_TEXT; });
}

function reasonText(reason: Record<string, unknown>) {
  if (typeof reason.label !== "string") return UNREADABLE_TEXT;
  const label = reason.label.trim();
  if (typeof reason.description !== "string" || !reason.description.trim()) return label;
  return label + DESCRIPTION_SEPARATOR + reason.description.trim();
}

function uncertaintyText(uncertainty: Record<string, unknown>) {
  if (typeof uncertainty.question !== "string" || typeof uncertainty.blocking !== "boolean") return UNREADABLE_TEXT;
  const question = uncertainty.question.trim();
  if (!question) return UNREADABLE_TEXT;
  return uncertainty.blocking ? BLOCKING_PREFIX + question : question;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
