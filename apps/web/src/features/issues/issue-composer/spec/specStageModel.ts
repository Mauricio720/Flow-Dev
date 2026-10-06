import type { SpecSnapshot, SpecStageName } from "./specContract";

export const STAGE_LABEL: Record<SpecStageName, string> = { prd: "PRD", tech_spec: "TechSpec", tasks: "Tasks" };
export const STATE_LABEL: Record<string, string> = {
  not_started: "Não iniciado", queued: "Na fila", running: "Em execução", waiting_question: "Aguardando sua resposta", waiting_permission: "Aguardando sua permissão",
  finalizing: "Capturando os documentos", review: "Em revisão", stopping: "Parando", failed: "Falhou", canceled: "Cancelado", approved: "Aprovado",
};
const ROUTE_STAGES: Record<string, SpecStageName[]> = { prd: ["prd", "tech_spec", "tasks"], tech_spec: ["tech_spec", "tasks"] };
const UNSUPPORTED_ROUTE_NOTE = "A rota aprovada não passa por especificação. Nenhuma etapa será iniciada automaticamente.";
const PRD_UNNECESSARY_NOTE = "O PRD é desnecessário nesta rota.";

export function requiredStages(route: string | null): SpecStageName[] {
  return route ? ROUTE_STAGES[route] ?? [] : [];
}

export function specLifecycle(snapshot: SpecSnapshot) {
  return snapshot.state in STATE_LABEL ? snapshot.state : "unknown";
}

export function stageNote(snapshot: SpecSnapshot, stage: SpecStageName) {
  if (stage === "prd" && snapshot.route === "tech_spec") return PRD_UNNECESSARY_NOTE;
  const required = requiredStages(snapshot.route);
  if (!required.includes(stage)) return UNSUPPORTED_ROUTE_NOTE;
  return null;
}

export function unavailableStartNote(snapshot: SpecSnapshot) {
  if (snapshot.route === null && snapshot.blockers.includes("route_unsupported")) return UNSUPPORTED_ROUTE_NOTE;
  return null;
}

export function stageState(snapshot: SpecSnapshot, stage: SpecStageName) {
  return snapshot.stages.find((item) => item.stage === stage)?.state ?? "not_started";
}

export function currentAttemptActive(snapshot: SpecSnapshot) {
  return snapshot.attempt !== null && ["queued", "dispatching", "running", "waiting", "finalizing", "stopping", "reconciling"].includes(snapshot.attempt.state);
}
