import type { ConnectionKind } from "@/lib/projects/contract";

export type ConnectionTone = "pending" | "ready" | "attention" | "blocked" | "muted";
type Presentation = { label: string; detail: string; tone: ConnectionTone };

export const CONNECTION_PRESENTATION: Record<ConnectionKind, Presentation> = {
  checking: { label: "Verificando acesso", detail: "Conferindo no GitHub se a sua conta alcança este repositório.", tone: "pending" },
  available: { label: "Repositório disponível", detail: "O GitHub confirmou o acesso da sua conta a este repositório.", tone: "ready" },
  authorization_needed: { label: "Autorização do GitHub necessária", detail: "Entrar no Flow Dev não libera repositórios. Autorize a leitura com a sua conta do GitHub para usar o código deste projeto.", tone: "attention" },
  access_denied_or_missing: { label: "Acesso ou repositório indisponível", detail: "O GitHub não confirmou o acesso da sua conta. O repositório pode ter sido movido, removido ou estar fora do seu alcance.", tone: "blocked" },
  temporarily_unavailable: { label: "GitHub temporariamente indisponível", detail: "Não foi possível falar com o GitHub agora. O projeto continua o mesmo e nada precisa ser recriado.", tone: "pending" },
  archived: { label: "Repositório arquivado", detail: "O repositório está arquivado no GitHub. A leitura continua, mas ações de escrita ficam bloqueadas.", tone: "muted" },
  unverified: { label: "Acesso não verificado", detail: "A verificação de acesso não foi concluída. Tente verificar de novo.", tone: "muted" },
};

export const CONNECTION_TONE_CLASS: Record<ConnectionTone, { dot: string; text: string }> = {
  pending: { dot: "node-running bg-ink-3", text: "text-ink-3" },
  ready: { dot: "bg-ink", text: "text-ink-2" },
  attention: { dot: "border-2 border-clarify", text: "text-clarify-ink" },
  blocked: { dot: "bg-github", text: "text-github-ink" },
  muted: { dot: "border border-ink-3", text: "text-ink-3" },
};
