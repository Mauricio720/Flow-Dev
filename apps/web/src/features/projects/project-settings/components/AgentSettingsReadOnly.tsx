import type { AgentSettingView } from "@/lib/projects/contract";
import { AGENTS_HEADING, AGENTS_INTRO, AGENTS_READ_ONLY_NOTE, AGENT_LABEL, DEFAULT_BADGE, EFFORT_LABEL, MODEL_UNAVAILABLE_MESSAGE, providerLabel } from "../agentSettingsCopy";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 px-5 py-3 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4">
      <dt className="text-sm text-ink-3">{label}</dt>
      <dd className="text-[15px] [overflow-wrap:anywhere]">{value}</dd>
    </div>
  );
}

function AgentSummary({ agent }: { agent: AgentSettingView }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-medium">{AGENT_LABEL[agent.agent]}{agent.isDefault && <span className="ml-2 text-xs font-normal text-ink-3">{DEFAULT_BADGE}</span>}</h3>
      <dl className="divide-y divide-line rounded-xl border border-line bg-raised">
        <Row label="Provedor" value={providerLabel(agent.provider)} />
        <Row label="Modelo" value={agent.model} />
        <Row label="Esforço" value={EFFORT_LABEL[agent.effort]} />
      </dl>
      {!agent.modelAvailable && <p role="alert" className="text-sm text-destructive">{MODEL_UNAVAILABLE_MESSAGE}</p>}
    </div>
  );
}

export function AgentSettingsReadOnly({ agents }: { agents: AgentSettingView[] }) {
  return (
    <section aria-labelledby="settings-agents" className="mt-10 flex flex-col gap-4">
      <h2 id="settings-agents" className="text-[15px] font-semibold">{AGENTS_HEADING}</h2>
      <p className="max-w-xl text-sm leading-6 text-ink-2">{AGENTS_INTRO}</p>
      {agents.map((agent) => <AgentSummary key={agent.agent} agent={agent} />)}
      <p className="text-sm text-ink-3">{AGENTS_READ_ONLY_NOTE}</p>
    </section>
  );
}
