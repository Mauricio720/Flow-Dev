import { RepositoryFacts } from "@/components/projects/RepositoryFacts";
import type { Project } from "@/lib/projects/contract";

export function RepositoryReadOnly({ project }: { project: Project }) {
  return (
    <section aria-labelledby="settings-repository" className="mt-10">
      <h2 id="settings-repository" className="text-[15px] font-semibold">Repositório do projeto</h2>
      <div className="mt-3 rounded-xl border border-line bg-surface px-5 py-4">
        {project.repository ? <RepositoryFacts repository={project.repository} /> : <span className="text-sm text-ink-3">Sem repositório vinculado</span>}
        <p className="mt-2 max-w-xl text-sm leading-6 text-ink-2">Somente leitura. O repositório é a identidade do projeto e não pode ser trocado; outro código pede um novo projeto.</p>
      </div>
    </section>
  );
}
