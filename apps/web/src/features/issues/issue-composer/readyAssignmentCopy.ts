import type { ReadyAssignmentState } from "./contract";

export const READY_ASSIGNMENT_MESSAGE: Record<ReadyAssignmentState, string> = {
  pending: "Atribuindo a você e colocando em Ready…",
  ready: "Atribuída a você e colocada em Ready. Ela já aparece em Trabalho atribuído, em “Atribuídas a você em Ready”, para você reivindicar.",
  not_assigned: "O GitHub não manteve você como responsável pela Issue, então ela foi para Backlog. Atribua-se e mova a Issue para Ready no GitHub.",
  ready_failed: "Atribuída a você, mas não foi possível colocar a Issue em Ready. Mova-a para Ready no quadro do GitHub.",
  unconfirmed: "Não foi possível confirmar a atribuição e o Ready desta Issue. Confira no GitHub.",
};
