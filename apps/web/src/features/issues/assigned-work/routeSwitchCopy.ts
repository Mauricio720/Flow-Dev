import { ROUTE_LABEL } from "./planningCopy";
import type { RouteSwitchView } from "./sessionContract";

export const ROUTE_SWITCH_CARD_LABEL = "Proposta de troca de rota";
export const ROUTE_SWITCH_REASONS_LABEL = "Motivos da troca";
export const ROUTE_SWITCH_RECORD_LABEL = "Troca de rota";
export const CONFIRM_SWITCH_LABEL = "Trocar para execução direta";
export const DECLINE_SWITCH_LABEL = "Continuar com a spec";
export const SWITCH_WAITING_LABEL = "Aguardando a pessoa operadora decidir a troca de rota";
export const SWITCH_EXPIRED_LABEL = "Proposta expirada: a sessão terminou antes da decisão";

const ROUTE_ARROW = " → ";

export function routeTrail(route: keyof typeof ROUTE_LABEL, switchedTo: keyof typeof ROUTE_LABEL | null) {
  return switchedTo ? `${ROUTE_LABEL[route]}${ROUTE_ARROW}${ROUTE_LABEL[switchedTo]}` : ROUTE_LABEL[route];
}

export function switchStateNote(proposal: Pick<RouteSwitchView, "state" | "decidedBy">) {
  if (proposal.state === "confirmed") return `Troca confirmada por ${proposal.decidedBy}`;
  if (proposal.state === "declined") return `Troca recusada por ${proposal.decidedBy}`;
  if (proposal.state === "expired") return SWITCH_EXPIRED_LABEL;
  return SWITCH_WAITING_LABEL;
}

function dayAndMinute(iso: string) {
  const parts = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(new Date(iso));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("day")}/${part("month")} ${part("hour")}:${part("minute")}`;
}

export function switchedRecord(decidedBy: string, decidedAt: string) {
  return `Trocada para Execução direta após as perguntas, confirmada por ${decidedBy} em ${dayAndMinute(decidedAt)}`;
}
