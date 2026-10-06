import { blockChanges, type ReviewBlock } from "@flow-dev/api/spec";
import type { LoadedDocument } from "./useSpecPackage";

type Revision = { manifestHash: string; parentManifestHash?: string | null; documents: LoadedDocument[] };
type Props = { current: Revision; parent: { manifestHash: string; documents: LoadedDocument[] } | null };

export function compareRevisions(current: Revision, parent: { manifestHash: string; documents: LoadedDocument[] } | null) {
  if (!parent) return { kind: "none" as const };
  if (current.parentManifestHash !== parent.manifestHash) return { kind: "mismatch" as const };
  const changes = current.documents.map((document) => ({ path: document.path, ...blockChanges(parent.documents.find((item) => item.path === document.path)?.blocks ?? [], document.blocks) }));
  const removedDocuments = parent.documents.filter((document) => !current.documents.some((item) => item.path === document.path)).map((document) => ({ path: document.path, added: [] as ReviewBlock[], removed: document.blocks }));
  return { kind: "diff" as const, changes: [...changes, ...removedDocuments].filter((item) => item.added.length + item.removed.length > 0) };
}

export function SpecChanges({ current, parent }: Props) {
  const result = compareRevisions(current, parent);
  if (result.kind === "none") return null;
  if (result.kind === "mismatch") return <p role="alert" className="text-sm text-destructive">A versão anterior não corresponde ao pai registrado. A comparação foi recusada.</p>;
  return (
    <section aria-label="Mudanças desta revisão" className="space-y-3">
      <h3 className="text-[15px] font-semibold">Mudanças desta revisão</h3>
      {result.changes.length === 0 && <p className="text-sm text-ink-2">Nenhuma diferença nos documentos capturados.</p>}
      {result.changes.map((change) => (
        <div key={change.path} className="space-y-1.5">
          <h4 className="text-sm font-medium">{change.path}</h4>
          {change.added.map((block) => <pre key={`+${block.id}`} className="whitespace-pre-wrap border-l-2 border-merge pl-3 text-sm"><span className="sr-only">Adicionado: </span>{block.content}</pre>)}
          {change.removed.map((block) => <pre key={`-${block.id}`} className="whitespace-pre-wrap border-l-2 border-destructive pl-3 text-sm line-through"><span className="sr-only">Removido: </span>{block.content}</pre>)}
        </div>
      ))}
    </section>
  );
}
