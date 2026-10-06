import { TRPC_BAD_REQUEST, TRPC_FORBIDDEN, TRPC_NOT_FOUND, TRPC_PRECONDITION_FAILED, TRPC_SERVICE_UNAVAILABLE, TRPC_TOO_MANY_REQUESTS } from "@/lib/projects/contract";

export type FailureCopy = { title: string; detail: string; retryable: boolean };

const GENERIC_FAILURE: FailureCopy = { title: "Não foi possível falar com o GitHub", detail: "A consulta não foi concluída. Seus dados continuam no formulário; tente de novo.", retryable: true };

const GITHUB_FAILURES: Record<string, FailureCopy> = {
  [TRPC_TOO_MANY_REQUESTS]: { title: "O GitHub limitou as consultas", detail: "Muitas consultas em pouco tempo. Aguarde um instante e tente de novo; o que você já preencheu continua aqui.", retryable: true },
  [TRPC_SERVICE_UNAVAILABLE]: { title: "GitHub temporariamente indisponível", detail: "O GitHub não respondeu agora. Nada foi criado e o formulário continua preenchido; tente de novo em instantes.", retryable: true },
  [TRPC_FORBIDDEN]: { title: "Permissão necessária", detail: "Confira se sua conta é administradora no Flow Dev e tem acesso ao repositório e à organização no GitHub.", retryable: false },
  [TRPC_NOT_FOUND]: { title: "Acesso ao repositório não confirmado", detail: "O GitHub não confirmou o acesso da sua conta a este repositório. Ele não foi tratado como conectado: confira o nome ou peça acesso no GitHub.", retryable: false },
  [TRPC_BAD_REQUEST]: { title: "Repositório inválido", detail: "O GitHub não reconheceu essa referência. Escolha um repositório da lista ou informe owner/nome.", retryable: false },
};

export function needsAuthorization(code: unknown) {
  return code === TRPC_PRECONDITION_FAILED;
}

export function githubFailureCopy(code: unknown) {
  return typeof code === "string" ? (GITHUB_FAILURES[code] ?? GENERIC_FAILURE) : GENERIC_FAILURE;
}

export function isGithubFailure(code: unknown) {
  return needsAuthorization(code) || (typeof code === "string" && code in GITHUB_FAILURES);
}
