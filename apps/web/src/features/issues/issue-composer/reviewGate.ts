import type { TaskStatus } from "./contract";

export type PublishBlock = "locked" | "busy" | "publishing" | "saving" | "dirty" | "stale" | "proposal" | "capturing" | "unreviewed";
export type ReviewInput = { locked: boolean; status: TaskStatus; dirty: boolean; saving: boolean; stale: boolean; proposalPending: boolean; capturing: boolean; previewReady: boolean };

const REVIEWABLE_STATUS: TaskStatus = "draft_ready";
const PUBLISHING_STATUS: TaskStatus = "publishing";

const FROZEN_BLOCKS: (PublishBlock | null)[] = ["locked", "busy", "publishing"];

export const PUBLISH_BLOCK_COPY: Record<PublishBlock, string> = {
  locked: "Recupere o acesso para salvar ou publicar. O que você alterou continua visível aqui, ainda sem salvar.",
  busy: "Conclua a conversa em andamento antes de criar a Issue.",
  publishing: "Enviando para o GitHub. Edição, mensagens e ditado ficam indisponíveis até a confirmação.",
  saving: "Aguarde o salvamento terminar para criar a Issue.",
  dirty: "Há alterações não salvas. Salve o draft para liberar a criação da Issue.",
  stale: "Existe uma revisão mais recente. Carregue-a antes de criar a Issue.",
  proposal: "Aplique ou descarte a proposta de refinamento antes de criar a Issue.",
  capturing: "Encerre o ditado antes de criar a Issue.",
  unreviewed: "Revise a publicação para conferir título, corpo, destino e conta antes de criar a Issue.",
};

export function publishBlock(input: ReviewInput): PublishBlock | null {
  if (input.locked) return "locked";
  if (input.status === PUBLISHING_STATUS) return "publishing";
  if (input.status !== REVIEWABLE_STATUS) return "busy";
  if (input.saving) return "saving";
  if (input.stale) return "stale";
  if (input.dirty) return "dirty";
  if (input.proposalPending) return "proposal";
  if (input.capturing) return "capturing";
  return input.previewReady ? null : "unreviewed";
}

export function isFrozen(block: PublishBlock | null) {
  return FROZEN_BLOCKS.includes(block);
}

export function canReview(block: PublishBlock | null) {
  return block === null || block === "unreviewed";
}
