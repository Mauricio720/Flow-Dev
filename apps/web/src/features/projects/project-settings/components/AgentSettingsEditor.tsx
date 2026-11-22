"use client";

import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import type { AgentCatalog, AgentSettingView } from "@/lib/projects/contract";
import { AGENTS_HEADING, AGENTS_INTRO, AGENT_DESCRIPTION, AGENT_LABEL, DEFAULT_BADGE, MODEL_UNAVAILABLE_MESSAGE } from "../agentSettingsCopy";
import { useAgentSettingsEditor } from "../hooks/useAgentSettingsEditor";
import { AgentChoiceFields } from "./AgentChoiceFields";

type BlockProps = { projectId: string; agent: AgentSettingView; catalog: AgentCatalog };

function AgentBlock({ projectId, agent, catalog }: BlockProps) {
  const editor = useAgentSettingsEditor(projectId, agent, catalog);
  const saving = editor.status === "saving";
  const label = AGENT_LABEL[agent.agent];
  function submit(event: FormEvent) {
    event.preventDefault();
    void editor.save();
  }
  return (
    <form onSubmit={submit} aria-label={label} noValidate className="flex flex-col gap-4 rounded-xl border border-line bg-raised p-5">
      <div>
        <h3 className="text-sm font-medium">{label}{editor.saved.isDefault && <span className="ml-2 text-xs font-normal text-ink-3">{DEFAULT_BADGE}</span>}</h3>
        <p className="mt-1 text-sm text-ink-3">{AGENT_DESCRIPTION[agent.agent]}</p>
      </div>
      <AgentChoiceFields agent={agent.agent} catalog={catalog} draft={editor.draft} disabled={saving} onChange={editor.change} />
      {!editor.saved.modelAvailable && <p role="alert" className="text-sm text-destructive">{MODEL_UNAVAILABLE_MESSAGE}</p>}
      {editor.message && <p role="alert" className="text-sm text-destructive">{editor.message}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={saving}>{saving ? "Salvando…" : `Salvar ${label}`}</Button>
        {editor.status === "saved" && <p role="status" className="text-sm text-ink-2">{label} salvo.</p>}
      </div>
    </form>
  );
}

export function AgentSettingsEditor({ projectId, agents, catalog }: { projectId: string; agents: AgentSettingView[]; catalog: AgentCatalog }) {
  return (
    <section aria-labelledby="settings-agents" className="mt-10 flex flex-col gap-4">
      <h2 id="settings-agents" className="text-[15px] font-semibold">{AGENTS_HEADING}</h2>
      <p className="max-w-xl text-sm leading-6 text-ink-2">{AGENTS_INTRO}</p>
      {agents.map((agent) => <AgentBlock key={agent.agent} projectId={projectId} agent={agent} catalog={catalog} />)}
    </section>
  );
}
