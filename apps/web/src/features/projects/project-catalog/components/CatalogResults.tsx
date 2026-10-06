import { Button } from "@/components/ui/button";
import type { ConnectionKind } from "@/lib/projects/contract";
import type { CatalogViewer } from "../catalogState";
import type { Catalog } from "../hooks/useCatalog";
import type { ProjectSelection } from "../hooks/useProjectSelection";
import { CatalogEmpty } from "./CatalogEmpty";
import { CatalogError } from "./CatalogStates";
import { ProjectEntry } from "./ProjectEntry";

type Props = { catalog: Catalog; viewer: CatalogViewer; selection: ProjectSelection; connectionOf: (projectId: string) => ConnectionKind };

export function CatalogResults({ catalog, viewer, selection, connectionOf }: Props) {
  const loading = catalog.status === "loading";
  const ready = catalog.status === "ready";
  return (
    <div aria-busy={loading}>
      {catalog.items.length > 0 && (
        <ul aria-label="Projetos disponíveis" className="mt-6 divide-y divide-line overflow-hidden rounded-xl border border-line bg-raised">
          {catalog.items.map((project) => (
            <ProjectEntry key={project.id} project={project} connection={connectionOf(project.id)} opening={selection.pendingId === project.id} recent={viewer.lastProjectId === project.id} onChoose={(projectId) => void selection.choose(projectId)} />
          ))}
        </ul>
      )}
      {catalog.status === "failed" && <CatalogError onRetry={catalog.retry} />}
      {ready && catalog.items.length === 0 && <CatalogEmpty catalog={catalog} viewer={viewer} />}
      {ready && catalog.nextCursor && <Button type="button" variant="outline" className="mt-4" onClick={catalog.loadMore}>Carregar mais projetos</Button>}
      {loading && <p role="status" className="mt-4 text-sm text-ink-3">Carregando projetos…</p>}
    </div>
  );
}
