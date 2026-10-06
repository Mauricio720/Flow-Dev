const CONNECTION_NOTICES: Record<string, string> = {
  connected: "Acesso aos repositórios autorizado para a sua conta do GitHub.",
  acesso_negado: "O GitHub não concedeu acesso aos repositórios. Nada foi alterado e você pode tentar de novo.",
  conta_diferente: "A conta autorizada no GitHub é diferente da conta usada para entrar no Flow Dev. Autorize com a mesma conta.",
  falha_autorizacao: "Não foi possível confirmar a autorização do GitHub. Tente novamente.",
  falha_temporaria: "O GitHub está temporariamente indisponível. Tente autorizar de novo em instantes.",
};

const ACCESS_NOTICES: Record<string, string> = {
  acesso_revogado: "Seu acesso a esse projeto mudou. Escolha outro projeto para continuar.",
};

const CREATED_NOTICE = "Projeto criado. Ele só aparece para outras pessoas depois que você atribuir o acesso em Acessos.";

type NoticeParams = { connection?: string | string[]; erro?: string | string[]; criado?: string | string[] };

export function projectNotice({ connection, erro, criado }: NoticeParams) {
  if (criado) return CREATED_NOTICE;
  if (typeof connection === "string" && CONNECTION_NOTICES[connection]) return CONNECTION_NOTICES[connection];
  if (typeof erro === "string" && ACCESS_NOTICES[erro]) return ACCESS_NOTICES[erro];
  return null;
}
