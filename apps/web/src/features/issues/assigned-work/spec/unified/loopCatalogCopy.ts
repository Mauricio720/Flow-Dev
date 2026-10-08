import { IMPLEMENT_LOOP, REVIEW_LOOP } from "./loopNames";
import type { FlowLoopOption } from "./unifiedContract";

const CATALOG_REASONS: Record<string, string> = {
  local_unavailable: "O conector local desta máquina não está respondendo. Abra o conector e aguarde alguns segundos para os Loops aparecerem.",
  local_loops_unreported: "O conector local ainda não informou os Loops desta máquina. Reinicie o conector para ele enviar a lista.",
  workspace_unregistered: "O checkout desta tarefa ainda não está registrado no CompozyOS do servidor, então não há Loops para listar.",
  no_loops: "O CompozyOS não oferece nenhum Loop para este projeto.",
};
const CATALOG_FALLBACK = "Não foi possível consultar os Loops no CompozyOS agora. Tente de novo em instantes.";
const OFFER_REASONS: Record<string, string> = {
  loop_disabled: "desativado",
  runtime_not_overridable: "sem runtime configurável",
  unsupported_required_input: "exige um campo que esta tela não preenche",
};
const OFFER_FALLBACK = "indisponível";
const NONE_OFFERABLE = "Nenhum dos Loops existentes pode ser iniciado por aqui";

const ROLE_LABELS: Record<string, string> = { worker: "agentes do Loop" };
const NOT_OFFERED = "O CompozyOS em uso não oferece o Loop desta etapa.";
export const REVIEW_WAITING_NOTICE = "O Review fica disponível quando a implementação das tarefas terminar com sucesso.";

export function runtimeRoleLabel(role: string) {
  return ROLE_LABELS[role] ?? role;
}

const INPUT_LABELS: Record<string, string> = {
  auto_commit: "Fazer commit automático ao concluir",
  mode: "Modo de execução",
  implementer: "Agente implementador",
  orchestrator: "Agente condutor (modo orchestrated)",
  reviewer: "Agente revisor",
  fixer: "Agente corretor",
  reviewed_worktree: "Worktree a revisar",
  slug: "Pasta das tarefas",
  task_name: "Tarefa revisada",
};

export function inputLabel(name: string) {
  return INPUT_LABELS[name] ?? name;
}

const LOOP_TITLES: Record<string, string> = { [IMPLEMENT_LOOP]: "Implementação", [REVIEW_LOOP]: "Review" };
const LOOP_DESCRIPTIONS: Record<string, string> = {
  [IMPLEMENT_LOOP]: "Implementa as tarefas aprovadas em ordem de dependência, uma por vez ou por um agente condutor.",
  [REVIEW_LOOP]: "Um agente revisa o que foi implementado, registra os achados e outro corrige os válidos, até uma rodada voltar limpa.",
};

export function loopTitle(name: string) {
  return LOOP_TITLES[name] ?? `Loop ${name}`;
}

export function loopDescription(name: string, fallback: string) {
  return LOOP_DESCRIPTIONS[name] ?? fallback;
}

export function offerReasonLabel(reason: string | null) {
  return OFFER_REASONS[reason ?? ""] ?? OFFER_FALLBACK;
}

export function missingLoopsNotice(loops: FlowLoopOption[], catalogReason: string | null) {
  if (loops.length === 0) return catalogReason === null ? NOT_OFFERED : CATALOG_REASONS[catalogReason] ?? CATALOG_FALLBACK;
  const blocked = loops.map((loop) => `${loop.name} (${offerReasonLabel(loop.reason)})`).join(", ");
  return `${NONE_OFFERABLE}: ${blocked}.`;
}
