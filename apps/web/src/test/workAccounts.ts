import type { WorkAccountChoice, WorkAccountOption, WorkAccounts } from "@/features/issues/assigned-work/workAccountsContract";
import { accountOf } from "./agentAccounts";

export const PERSONAL_ID = "00000000-0000-4000-8000-0000000000c1";
export const WORK_ID = "00000000-0000-4000-8000-0000000000c2";
export const CODEX_B_ID = "00000000-0000-4000-8000-0000000000c3";

export const PERSONAL: WorkAccountOption = accountOf(PERSONAL_ID, { label: "Pessoal", status: "logged_in" });
export const WORK: WorkAccountOption = accountOf(WORK_ID, { label: "Trabalho", status: "logged_out" });
export const CODEX_B: WorkAccountOption = accountOf(CODEX_B_ID, { label: "Codex B", provider: "codex", status: "logged_in" });

export function defaultChoice(provider: WorkAccountChoice["provider"]): WorkAccountChoice {
  return { provider, accountId: null, label: "Login padrão desta máquina", status: "default" };
}

export function chosen(option: WorkAccountOption): WorkAccountChoice {
  return { provider: option.provider, accountId: option.id, label: option.label, status: option.status };
}

export function workAccountsOf(patch: Partial<WorkAccounts> = {}): WorkAccounts {
  return { choices: [defaultChoice("claude"), defaultChoice("codex")], options: { claude: [], codex: [] }, version: 0, ...patch };
}
