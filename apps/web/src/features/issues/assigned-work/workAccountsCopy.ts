import type { ExecutionSession } from "./executionContract";
import type { WorkAccountProvider } from "./workAccountsContract";

export const WORK_ACCOUNTS_SECTION_ID = "contas-deste-trabalho";
export const WORK_ACCOUNTS_HEADING = "Contas deste trabalho";
export const WORK_ACCOUNTS_INTRO = "As sessões novas deste trabalho rodam na conta escolhida para o agente delas. Uma sessão já aberta continua na conta em que nasceu.";
export const DEFAULT_ACCOUNT_OPTION = "Login padrão desta máquina";
export const REGISTER_ACCOUNTS_LABEL = "Cadastrar contas";
export const STALE_CHOICE_MESSAGE = "A escolha mudou; recarregue";
export const CHOICE_FAILED_MESSAGE = "Não foi possível salvar a conta agora. Tente de novo.";
export const SAVING_CHOICE_NOTE = "Salvando a escolha…";
export const CHANGE_ACCOUNT_LABEL = "Trocar conta";
export const PROVIDERS: WorkAccountProvider[] = ["claude", "codex"];

export const ACCOUNT_SELECT_LABEL: Record<WorkAccountProvider, string> = { claude: "Conta do Claude Code", codex: "Conta do Codex" };

export function accountSelectId(provider: WorkAccountProvider) {
  return `work-account-${provider}`;
}

export function sessionAccountText(label: string) {
  return `Conta: ${label}`;
}

const DEFAULT_LOGIN_HISTORY_LABEL = "Login padrão";
const OTHER_PERSON_ACCOUNT_LABEL = "Conta pessoal da pessoa operadora";
const REMOVED_SUFFIX = " (removida)";

export function historyAccountText(account: ExecutionSession["account"]) {
  if (account.kind === "default") return DEFAULT_LOGIN_HISTORY_LABEL;
  if (account.kind === "other" || !account.label) return OTHER_PERSON_ACCOUNT_LABEL;
  return account.removed ? `${account.label}${REMOVED_SUFFIX}` : account.label;
}

