import type { AgentSettings, LocalCheckout, Project } from "@/lib/projects/contract";
import { AgentSettingsEditor } from "./components/AgentSettingsEditor";
import { AgentSettingsReadOnly } from "./components/AgentSettingsReadOnly";
import { BoardEditor } from "./components/BoardEditor";
import { BoardReadOnly } from "./components/BoardReadOnly";
import { DetailsEditor } from "./components/DetailsEditor";
import { DetailsReadOnly } from "./components/DetailsReadOnly";
import { LocalCheckoutSection } from "./components/LocalCheckoutSection";
import { RepositoryReadOnly } from "./components/RepositoryReadOnly";

type Props = { project: Project; canEdit: boolean; agentSettings: AgentSettings; localCheckout?: LocalCheckout };

export function ProjectSettings({ project, canEdit, agentSettings, localCheckout = null }: Props) {
  return (
    <main className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-[-0.03em]">Configurações</h1>
        <p className="mt-3 max-w-xl text-[15px] leading-7 text-ink-2">Nome e descrição ajudam o time a reconhecer o projeto no catálogo. O repositório é fixo. O quadro do GitHub define onde as issues publicadas entram como Backlog. Os agentes definem com qual assinatura o rascunho e o planejamento rodam.</p>
        <RepositoryReadOnly project={project} />
        <LocalCheckoutSection projectId={project.id} initial={localCheckout} />
        {canEdit ? <DetailsEditor project={project} /> : <DetailsReadOnly project={project} />}
        {canEdit ? <BoardEditor project={project} /> : <BoardReadOnly project={project} />}
        {canEdit ? <AgentSettingsEditor projectId={project.id} agents={agentSettings.agents} catalog={agentSettings.catalog} /> : <AgentSettingsReadOnly agents={agentSettings.agents} />}
      </div>
    </main>
  );
}
