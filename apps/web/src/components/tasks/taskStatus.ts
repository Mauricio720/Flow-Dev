import type { TaskStatus } from "@/lib/tasks/contract";

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  generating: "Gerando draft",
  awaiting_clarification: "Aguardando resposta",
  draft_ready: "Draft pronto",
  generation_failed: "Geração falhou",
  publishing: "Publicando",
  publication_uncertain: "Verificando publicação",
  published: "Publicada",
};

export const TASK_STATUS_NODE: Record<TaskStatus, string> = {
  generating: "node-running rounded-full bg-project",
  awaiting_clarification: "rounded-full border-2 border-clarify bg-surface",
  draft_ready: "rounded-[2px] border-2 border-merge bg-surface",
  generation_failed: "rounded-full border-2 border-github bg-surface",
  publishing: "node-running rounded-full bg-merge",
  publication_uncertain: "rounded-full border-[1.5px] border-dashed border-merge bg-surface",
  published: "rounded-full bg-merge",
};

export const TASK_STATUS_INK: Record<TaskStatus, string> = {
  generating: "text-project-ink",
  awaiting_clarification: "text-clarify-ink",
  draft_ready: "text-merge-ink",
  generation_failed: "text-github-ink",
  publishing: "text-merge-ink",
  publication_uncertain: "text-merge-ink",
  published: "text-ink-3",
};
