import type { PlanningDetail, TaskDetail } from "./contract";
import { PLANNING_STATUS_LABEL } from "./planningCopy";

export type PlanningLifecycle = keyof typeof PLANNING_STATUS_LABEL | "unknown";
export type TimelineState = "done" | "current" | "failed" | "pending";
export type TimelineEntry = { key: string; label: string; actor: string; state: TimelineState; at: string | null; action: string | null };

const KNOWN: string[] = Object.keys(PLANNING_STATUS_LABEL);
const ISSUE_AUTHOR = "Issue Author";
const DEV_CONTROL = "Dev Control";
const AUTHOR_ROLE = "Pessoa autora";

export function planningLifecycle(planning: PlanningDetail): PlanningLifecycle | null {
  if (planning.status === null) return null;
  return KNOWN.includes(planning.status) ? (planning.status as PlanningLifecycle) : "unknown";
}

function planningEntries(detail: TaskDetail, authorName: string): TimelineEntry[] {
  const { planning } = detail;
  const decision = planning.decision;
  const author = authorName || AUTHOR_ROLE;
  if (planning.status === "awaiting") return [{ key: "planning", label: "Planejamento", actor: DEV_CONTROL, state: "pending", at: null, action: "Analisar a próxima etapa" }];
  if (planning.status === "in_progress") return [{ key: "planning", label: "Análise em andamento", actor: DEV_CONTROL, state: "current", at: planning.operation?.createdAt ?? null, action: "Aguardar a recomendação" }];
  if (planning.status === "failed") return [{ key: "planning", label: "Análise falhou", actor: DEV_CONTROL, state: "failed", at: planning.operation?.createdAt ?? null, action: "Tentar novamente" }];
  if (!decision) return [];
  const produced: TimelineEntry = { key: "recommendation", label: "Recomendação produzida", actor: DEV_CONTROL, state: "done", at: decision.createdAt, action: null };
  if (decision.status === "approved") return [produced, { key: "approval", label: "Rota aprovada", actor: author, state: "done", at: decision.approvedAt, action: null }];
  return [produced, { key: "approval", label: "Aprovação pendente", actor: author, state: "current", at: null, action: "Revisar e aprovar a rota" }];
}

export function timelineEntries(detail: TaskDetail): TimelineEntry[] {
  const authorName = detail.task.authorName ?? "";
  const intent: TimelineEntry = { key: "intent", label: "Intenção refinada", actor: ISSUE_AUTHOR, state: "done", at: detail.task.createdAt, action: null };
  const published: TimelineEntry = { key: "publication", label: "Issue publicada", actor: authorName || AUTHOR_ROLE, state: "done", at: detail.publication?.createdAt ?? null, action: null };
  return [intent, published, ...planningEntries(detail, authorName)];
}

export function currentAction(detail: TaskDetail) {
  const { planning } = detail;
  if (planning.status === "awaiting") return planning.eligibility.canStart ? "Analisar a próxima etapa" : null;
  if (planning.status === "review") return "Revisar a rota e aprovar o planejamento";
  if (planning.status === "failed") return "Tentar a análise de novo";
  return null;
}
