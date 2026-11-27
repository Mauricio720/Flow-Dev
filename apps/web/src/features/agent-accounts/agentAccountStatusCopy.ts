export { PROVIDER_LABEL, STATUS_LABEL } from "@/lib/agentAccounts/accountLabels";

export const AGENT_ACCOUNTS_HEADING = "Contas de IA";
export const AGENT_ACCOUNTS_INTRO = "Cadastre as suas contas de assinatura do Claude Code e do Codex e faça login em cada uma pelo terminal. Só você vê e usa estas contas, e só nesta máquina.";
export const AGENT_ACCOUNTS_LIST_LABEL = "Contas cadastradas";
export const AGENT_ACCOUNTS_EMPTY_NOTE = "Nenhuma conta cadastrada ainda. Sem contas, as sessões usam o login padrão desta máquina.";
export const BACK_TO_PROJECTS_LABEL = "Voltar aos projetos";

export function planNote(plan: string) {
  return `Plano ${plan}`;
}
