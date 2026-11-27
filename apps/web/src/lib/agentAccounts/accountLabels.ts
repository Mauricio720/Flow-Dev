import type { RouterOutputs } from "@flow-dev/api";

type AccountView = RouterOutputs["agentAccounts"]["list"][number];

export const PROVIDER_LABEL: Record<AccountView["provider"], string> = { claude: "Claude Code", codex: "Codex" };

export const STATUS_LABEL: Record<AccountView["status"], string> = {
  pending_login: "Aguardando login",
  logged_in: "Logada",
  logged_out: "Deslogada",
  check_failed: "Falha na verificação",
};
