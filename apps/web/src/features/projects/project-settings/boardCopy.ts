import { TRPC_BAD_REQUEST, TRPC_FORBIDDEN, TRPC_NOT_FOUND, TRPC_PRECONDITION_FAILED } from "@/lib/projects/contract";

export const BOARD_URL_EXAMPLE = "https://github.com/orgs/sua-org/projects/1";
export const EMPTY_BOARD_URL = "Informe o link do quadro do GitHub.";
const BACKLOG_MISSING_CODE = "UNPROCESSABLE_CONTENT";
const GENERIC_FAILURE = "Não foi possível salvar o quadro agora. A configuração anterior continua valendo; tente de novo.";

const BOARD_FAILURES: Record<string, string> = {
  [TRPC_BAD_REQUEST]: `Use o link de um GitHub Project, como ${BOARD_URL_EXAMPLE}.`,
  [TRPC_NOT_FOUND]: "Não encontramos esse quadro com a sua conta do GitHub. Confira o link e se você tem acesso a ele.",
  [BACKLOG_MISSING_CODE]: "Esse quadro não tem a opção Backlog no campo Status. Crie a opção no GitHub e salve de novo.",
  [TRPC_FORBIDDEN]: "Sua conta não pode alterar o quadro deste projeto. Nada foi alterado.",
};

export function needsBoardAuthorization(code: unknown) {
  return code === TRPC_PRECONDITION_FAILED;
}

export function boardFailureCopy(code: unknown) {
  return typeof code === "string" && BOARD_FAILURES[code] ? BOARD_FAILURES[code] : GENERIC_FAILURE;
}
