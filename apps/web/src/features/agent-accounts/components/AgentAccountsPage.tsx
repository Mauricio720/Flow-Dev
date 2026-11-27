"use client";

import Link from "next/link";
import { AppHeader } from "@/components/shared/AppHeader";
import { Button } from "@/components/ui/button";
import { PROJECTS_PATH } from "@/lib/navigation/projectRoutes";
import { AGENT_ACCOUNTS_HEADING, AGENT_ACCOUNTS_INTRO, BACK_TO_PROJECTS_LABEL } from "../agentAccountStatusCopy";
import { useAgentAccounts } from "../hooks/useAgentAccounts";
import type { AgentAccount } from "../types";
import { AgentAccountCreateForm } from "./AgentAccountCreateForm";
import { AgentAccountList } from "./AgentAccountList";

export function AgentAccountsPage({ initial }: { initial: AgentAccount[] }) {
  const state = useAgentAccounts(initial);
  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader actions={<Button variant="ghost" size="sm" asChild><Link href={PROJECTS_PATH}>{BACK_TO_PROJECTS_LABEL}</Link></Button>} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-[-0.03em]">{AGENT_ACCOUNTS_HEADING}</h1>
          <p className="mt-3 max-w-xl text-[15px] leading-7 text-ink-2">{AGENT_ACCOUNTS_INTRO}</p>
        </div>
        <AgentAccountCreateForm onCreated={state.add} />
        <AgentAccountList accounts={state.accounts} handlers={{ onChange: state.replace, onRemoved: state.drop }} />
      </main>
    </div>
  );
}
