import type { TaskDetail, TaskStatus } from "./contract";

const NEW_INTENT_PLACEHOLDER = "Descreva o que você quer mudar…";
const PROPOSAL_GUARD = "Aplique ou descarte a proposta de refinamento antes de enviar outra mensagem.";

const PLACEHOLDER: Record<TaskStatus, string> = {
  generating: "Aguarde o Issue Author terminar…",
  awaiting_clarification: "Responda à pergunta do Issue Author…",
  draft_ready: "Peça um ajuste no draft…",
  generation_failed: "Reescreva o pedido ou tente a geração de novo…",
  publishing: "Publicação em andamento…",
  publication_uncertain: "Publicação em verificação…",
  published: "",
};

const STATUS_GUARD: Partial<Record<TaskStatus, string>> = {
  generating: "O Issue Author está trabalhando. Aguarde a resposta para enviar outra mensagem.",
  publishing: "Publicação em andamento. Mensagens, edição e ditado ficam indisponíveis.",
  publication_uncertain: "Publicação em verificação. Mensagens e ditado ficam indisponíveis até o resultado ser confirmado.",
  published: "A Issue foi publicada e não aceita novas mensagens. O planejamento segue na própria tarefa; para outra mudança, comece uma nova intenção.",
};

export function composerPlaceholder(detail: TaskDetail | null) {
  return detail ? PLACEHOLDER[detail.task.status] : NEW_INTENT_PLACEHOLDER;
}

export function composerGuard(detail: TaskDetail | null, lock: string | null) {
  if (lock) return lock;
  if (!detail) return null;
  if (detail.pendingProposal) return PROPOSAL_GUARD;
  return STATUS_GUARD[detail.task.status] ?? null;
}
