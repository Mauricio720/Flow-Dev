import { isApproved } from "../flowStages";
import type { FlowPackage } from "../unifiedContract";

export type NextStep = { text: string; toApproval: boolean };
export type NextStepInput = { selected: FlowPackage; latest: FlowPackage; canAct: boolean; generating: boolean; missingPoints: number };

const APPROVED_NEXT: Record<string, string> = {
  os_spec_v1: "Spec aprovada. O próximo passo é criar as tarefas, na etapa Tarefas.",
  os_tasks_v1: "Tarefas aprovadas. O próximo passo é rodar a implementação, na etapa Implementação.",
};
const REVIEW_NEXT: Record<string, string> = {
  os_spec_v1: "Revise esta versão e aprove para liberar a criação das tarefas.",
  os_tasks_v1: "Revise estas tarefas e aprove para liberar a implementação.",
};
const APPROVED_FALLBACK = "Versão aprovada.";
const REVIEW_FALLBACK = "Revise esta versão e aprove.";
const GENERATING = "O agente está gerando uma nova versão. Ela aparece aqui quando a execução terminar.";
const WAITING_OPERATOR = "Aguardando a pessoa operadora revisar e aprovar esta versão.";

function pointsLabel(count: number) {
  return count === 1 ? "o ponto em aberto" : `os ${count} pontos em aberto`;
}

export function nextStepOf({ selected, latest, canAct, generating, missingPoints }: NextStepInput): NextStep {
  if (selected.id !== latest.id) return { text: `Esta é uma versão anterior. A versão atual é a v${latest.version}.`, toApproval: false };
  if (generating) return { text: GENERATING, toApproval: false };
  if (isApproved(selected)) return { text: APPROVED_NEXT[selected.format] ?? APPROVED_FALLBACK, toApproval: false };
  if (!canAct) return { text: WAITING_OPERATOR, toApproval: false };
  if (missingPoints > 0) return { text: `Confirme ${pointsLabel(missingPoints)} e aprove a versão ${selected.version}.`, toApproval: true };
  return { text: REVIEW_NEXT[selected.format] ?? REVIEW_FALLBACK, toApproval: true };
}
