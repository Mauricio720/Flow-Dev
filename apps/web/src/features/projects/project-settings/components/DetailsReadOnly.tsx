import type { Project } from "@/lib/projects/contract";

export function DetailsReadOnly({ project }: { project: Project }) {
  return (
    <section aria-labelledby="settings-details" className="mt-10">
      <h2 id="settings-details" className="text-[15px] font-semibold">Nome e descrição</h2>
      <dl className="mt-3 divide-y divide-line rounded-xl border border-line bg-raised">
        <div className="grid gap-1 px-5 py-3 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4">
          <dt className="text-sm text-ink-3">Nome</dt>
          <dd className="text-[15px] [overflow-wrap:anywhere]">{project.name}</dd>
        </div>
        {project.description && (
          <div className="grid gap-1 px-5 py-3 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4">
            <dt className="text-sm text-ink-3">Descrição</dt>
            <dd className="text-[15px] leading-7 [overflow-wrap:anywhere]">{project.description}</dd>
          </div>
        )}
      </dl>
      <p className="mt-3 text-sm text-ink-3">Somente administradores editam os detalhes do projeto.</p>
    </section>
  );
}
