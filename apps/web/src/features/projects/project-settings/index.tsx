import type { Project } from "@/lib/projects/contract";
import { BoardEditor } from "./components/BoardEditor";
import { BoardReadOnly } from "./components/BoardReadOnly";
import { DetailsEditor } from "./components/DetailsEditor";
import { DetailsReadOnly } from "./components/DetailsReadOnly";
import { RepositoryReadOnly } from "./components/RepositoryReadOnly";

type Props = { project: Project; canEdit: boolean };

export function ProjectSettings({ project, canEdit }: Props) {
  return (
    <main className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-[-0.03em]">Configurações</h1>
        <p className="mt-3 max-w-xl text-[15px] leading-7 text-ink-2">Nome e descrição ajudam o time a reconhecer o projeto no catálogo. O repositório é fixo. O quadro do GitHub define onde as issues publicadas entram como Backlog.</p>
        <RepositoryReadOnly project={project} />
        {canEdit ? <DetailsEditor project={project} /> : <DetailsReadOnly project={project} />}
        {canEdit ? <BoardEditor project={project} /> : <BoardReadOnly project={project} />}
      </div>
    </main>
  );
}
