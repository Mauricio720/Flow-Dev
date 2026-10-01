import { FolderIcon, GitHubMark, LayersIcon } from "@/components/icons";
import { toolSource, type Session, type Source, type ToolCall } from "../model";

const groups: { source: Source; label: string; icon: React.ReactNode; swatch: string; ink: string }[] = [
  { source: "project", label: "Projeto", icon: <FolderIcon />, swatch: "bg-project", ink: "text-project-ink" },
  { source: "github", label: "GitHub", icon: <GitHubMark />, swatch: "bg-github", ink: "text-github-ink" },
];

const legend = [
  { label: "Você", node: <span className="size-3 rounded-full border-2 border-ink bg-ground" /> },
  { label: "Issue Author", node: <span className="size-3 rounded-full bg-ink" /> },
  { label: "Pergunta ao dev", node: <span className="size-3.5 rounded-full border-[3px] border-clarify bg-ground" /> },
  { label: "Draft (merge)", node: <span className="h-3 w-5 rounded-full border-[2.5px] border-merge bg-ground" /> },
  { label: "Publicada", node: <span className="size-3.5 rounded-full bg-merge" /> },
];

export function SourcesPanel({ session }: { session: Session }) {
  const calls = session.items.flatMap((item) => (item.kind === "tools" ? item.calls : [])).filter((c) => c.status !== "running");
  const bySource = (source: Source) => calls.filter((call: ToolCall) => toolSource[call.tool] === source);

  return (
    <aside aria-label="Contexto consultado" className="flex h-full flex-col gap-8 overflow-y-auto px-5 py-5">
      <section>
        <h2 className="text-sm font-semibold">Contexto consultado</h2>
        <p className="mt-1 text-xs leading-relaxed text-ink-3">O que o Issue Author leu nesta intenção.</p>

        <div className="mt-5 space-y-6">
          {groups.map((group) => {
            const entries = bySource(group.source);
            return (
              <div key={group.source}>
                <h3 className={`flex items-center gap-2 text-sm font-medium ${group.ink}`}>
                  <span className={`h-[3px] w-4 rounded-full ${group.swatch}`} aria-hidden="true" />
                  {group.label}
                  <span className="ml-auto font-mono text-xs text-ink-3 tabular-nums">{entries.length}</span>
                </h3>
                {entries.length === 0 ? (
                  <p className="mt-2 pl-6 text-xs text-ink-3">Nenhuma consulta ainda.</p>
                ) : (
                  <ul className="mt-2 space-y-2 pl-6">
                    {entries.map((call) => (
                      <li key={call.id} className="min-w-0">
                        <p className="truncate font-mono text-[12.5px] text-ink" title={call.target}>
                          {call.target}
                        </p>
                        <p className="text-xs text-ink-3">
                          <span className="font-mono">{call.tool}</span> · {call.result}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}

          <div>
            <h3 className="flex items-center gap-2 text-sm font-medium text-ink-3">
              <span className="w-4 border-t-2 border-dashed border-ink-3" aria-hidden="true" />
              Outros contextos
            </h3>
            <p className="mt-2 flex items-center gap-2 pl-6 text-xs text-ink-3">
              <LayersIcon size={14} /> Novas fontes chegam em breve.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-auto border-t border-line pt-5">
        <h2 className="text-xs font-medium text-ink-3">Como ler o trilho</h2>
        <ul className="mt-3 space-y-2">
          {legend.map((entry) => (
            <li key={entry.label} className="flex items-center gap-3 text-xs text-ink-2">
              <span className="grid w-5 place-items-center" aria-hidden="true">
                {entry.node}
              </span>
              {entry.label}
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}
