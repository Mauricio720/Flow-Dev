export const PATH_REQUIRED = "Informe o caminho absoluto da pasta";
export const COMPOZY_UNAVAILABLE = "CompozyOS indisponível nesta máquina";
export const BINDING_CONFLICT = "O vínculo mudou; recarregue";
export const NOT_CONFIGURED = "A execução no CompozyOS ainda não foi configurada para este projeto.";
export const LOAD_FAILURE = "Não foi possível carregar o vínculo com o CompozyOS agora. Recarregue a página para tentar de novo.";
const GENERIC_FAILURE = "Não foi possível verificar a pasta agora. O vínculo salvo continua o mesmo; tente de novo.";
const UNKNOWN_INVALID = "A pasta não passou na verificação.";
const REMOTE_MISMATCH_CODE = "checkout_remote_mismatch";
const DEFAULT_BRANCH_HINT = "Não foi possível identificar o branch padrão; rode `git remote set-head origin --auto`";

const FAILURES: Record<string, string> = {
  checkout_path_not_absolute: PATH_REQUIRED,
  compozy_unavailable: COMPOZY_UNAVAILABLE,
  binding_conflict: BINDING_CONFLICT,
  compozy_unconfigured: "Configuração do CompozyOS inválida no servidor",
  forbidden: "Você não tem permissão para esta ação",
};

const INVALID_REASONS: Record<string, string> = {
  checkout_not_found: "Pasta não encontrada ou sem acesso",
  checkout_not_git_root: "A pasta não é a raiz de um repositório git",
  default_branch_unknown: DEFAULT_BRANCH_HINT,
};

export function bindingFailureCopy(reason: unknown) {
  return typeof reason === "string" && FAILURES[reason] ? FAILURES[reason] : GENERIC_FAILURE;
}

export function loadFailureCopy(reason: unknown) {
  return typeof reason === "string" && FAILURES[reason] ? FAILURES[reason] : LOAD_FAILURE;
}

export function invalidReasonCopy(failureCode: string | null, repository: string) {
  if (failureCode === REMOTE_MISMATCH_CODE) return `O repositório desta pasta não é ${repository}`;
  return (failureCode && INVALID_REASONS[failureCode]) || UNKNOWN_INVALID;
}

export function cloneHint(repository: string) {
  return `Informe a pasta de um clone de ${repository} nesta máquina. As execuções deste projeto rodam nela.`;
}

export function healthCopy(version: string | null) {
  return version ? `CompozyOS ${version} acessível` : COMPOZY_UNAVAILABLE;
}
