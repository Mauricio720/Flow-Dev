import type { WorktreeBase, WorktreeFolderPreview, WorktreeMode } from "./worktreeContract";

export const WORKTREE_SECTION_TITLE = "Onde trabalhar";
export const WORKTREE_LEGEND = "Onde as sessões deste trabalho rodam";
export const WORKTREE_MODE_ORDER: WorktreeMode[] = ["worktree", "checkout"];
export const WORKTREE_MODE_LABEL: Record<WorktreeMode, string> = { worktree: "Com worktree", checkout: "Sem worktree" };
export const CHECKOUT_MODE_DESCRIPTION = "As sessões rodam direto na pasta configurada do projeto, como antes.";
export const SAVE_CHOICE_LABEL = "Salvar escolha";
export const SAVING_CHOICE_LABEL = "Salvando…";
export const CHOICE_REQUIRED_NOTE = "Escolha onde trabalhar antes de iniciar a primeira sessão.";
export const LOCKED_NOTE = "A escolha fica fixa depois que a primeira sessão abre.";
export const READER_PENDING_NOTE = "A pessoa operadora ainda não escolheu onde trabalhar.";
export const CHOICE_FAILED_MESSAGE = "Não foi possível salvar a escolha agora. Tente de novo.";
export const WORKTREE_FOLDER_LABEL = "Worktree";
export const BASE_DIRTY_WARNING = "As mudanças não commitadas da pasta configurada não vão para o worktree.";
export const CHOICE_MISSING_IN_DIALOG = "Escolha onde trabalhar, com ou sem worktree, na etapa Planejamento antes de iniciar a primeira sessão.";

const NEW_BRANCH_FALLBACK = "deste trabalho";

export function worktreeModeDescription(mode: WorktreeMode, branch: string | null) {
  if (mode === "checkout") return CHECKOUT_MODE_DESCRIPTION;
  return `Cria a branch ${branch ?? NEW_BRANCH_FALLBACK} e uma pasta só deste trabalho ao lado do clone, a partir do commit atual da pasta configurada. As mudanças não commitadas do clone não vão junto.`;
}

function baseOf(base: WorktreeBase) {
  return base.branch ? `da branch ${base.branch}` : `do commit ${base.detachedSha ?? "atual"}`;
}

export function worktreeStateNote(preview: WorktreeFolderPreview, base: WorktreeBase): string | null {
  if (preview.state === "create") return `O worktree será criado agora, na branch nova ${preview.branch}, a partir ${baseOf(base)} da pasta configurada.`;
  if (preview.state === "from_branch") return `O worktree será criado agora a partir da branch ${preview.branch}, que já existe no clone.`;
  if (preview.state === "restore_folder") return `A pasta do worktree não existe mais. Ela será recriada a partir da branch ${preview.branch}.`;
  if (preview.state === "restore_branch") return `A branch ${preview.branch} não existe mais. Ela será criada de novo a partir ${baseOf(base)} da pasta configurada.`;
  if (preview.state === "conflict") return "Essa pasta já existe e não é o worktree deste trabalho. Mova ou apague a pasta para iniciar a sessão.";
  if (preview.state === "branch_busy") return `A branch ${preview.branch} está em uso em ${preview.busyPath}. Troque a branch dessa pasta para iniciar a sessão.`;
  return null;
}
