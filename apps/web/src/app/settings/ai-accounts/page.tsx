import type { Metadata } from "next";
import { AgentAccountsPage } from "@/features/agent-accounts/components/AgentAccountsPage";
import { loadAgentAccounts } from "@/features/agent-accounts/server/loadAgentAccounts";

export const metadata: Metadata = { title: "Contas de IA · Flow Dev" };

export default async function AiAccountsPage() {
  return <AgentAccountsPage initial={await loadAgentAccounts()} />;
}
