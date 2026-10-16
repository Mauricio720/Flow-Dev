const REASON_COPY: Record<string, string> = {
  github_permission_denied: "O GitHub recusou a exclusão. A issue continua no GitHub e no Flow Dev.",
  provider_rate_limited: "O GitHub limitou as solicitações. Aguarde o prazo indicado antes de tentar novamente.",
  provider_unavailable: "O GitHub está indisponível. A issue permanece disponível para uma nova tentativa.",
  authorization_needed: "Autorize novamente sua conta do GitHub para continuar a exclusão.",
  identity_conflict: "A identidade da issue mudou. Ela foi mantida para evitar excluir outro item.",
  missing_identity: "Não foi possível confirmar a identidade da issue. Ela foi mantida para recuperação.",
  invalid_target: "O item não é uma issue que possa ser excluída.",
  unknown_remote_outcome: "Ainda não foi possível confirmar o resultado no GitHub. A issue foi mantida.",
  unknown_stop: "O Flow Dev ainda não confirmou a interrupção do trabalho. A issue foi mantida.",
  uncertain_publication: "O resultado da publicação ainda é incerto. A issue foi mantida para recuperação.",
  repository_access_lost: "Seu acesso ao repositório mudou. A issue foi mantida para recuperação.",
  stale_fence: "O trabalho mudou durante a exclusão. Atualize o estado antes de tentar novamente.",
  forbidden: "Você não tem permissão para excluir esta issue.",
};

export function deletionReasonCopy(reason: string | null | undefined) {
  return reason ? REASON_COPY[reason] ?? "Não foi possível concluir a exclusão. A issue foi mantida para recuperação." : null;
}

export function deletionErrorCopy(code: string | null, reason: string | null) {
  if (reason) return deletionReasonCopy(reason)!;
  const errors: Record<string, string> = {
    UNAUTHORIZED: "Sua sessão expirou. Entre novamente para continuar.",
    NOT_FOUND: "A issue não está mais disponível neste projeto.",
    FORBIDDEN: "Você não tem permissão para excluir esta issue.",
    PRECONDITION_FAILED: "A issue mudou desde a confirmação. Atualize a página e revise os dados.",
    CONFLICT: "Já existe uma exclusão em andamento para esta issue.",
  };
  return code ? errors[code] ?? "Não foi possível confirmar a exclusão. A issue permanece disponível." : "Não foi possível confirmar a exclusão. A issue permanece disponível.";
}

export function preservedArtifactsCopy() {
  return "As worktrees e seus arquivos, branches e Pull Requests permanecem após a exclusão.";
}

export function deletionStatusCopy(state: string) {
  const labels: Record<string, string> = {
    stopping: "Interrompendo o trabalho ativo…",
    reconciling: "Confirmando publicações em andamento…",
    deleting_remote: "Excluindo a issue no GitHub…",
    verifying_remote: "Confirmando o resultado no GitHub…",
    cleaning_local: "Removendo o histórico do Flow Dev…",
    recoverable: "A exclusão precisa de uma nova tentativa.",
    completed: "Issue excluída com confirmação.",
  };
  return labels[state] ?? "Acompanhando o estado da exclusão…";
}

export function remotePresenceCopy(presence: string) {
  const labels: Record<string, string> = { not_applicable: "Não se aplica", present: "Confirmada no GitHub", absent: "Ausência confirmada no GitHub", unknown: "Ainda não confirmada" };
  return labels[presence] ?? "Ainda não confirmada";
}
