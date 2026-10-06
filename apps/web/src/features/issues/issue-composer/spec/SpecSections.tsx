import { buildSections, type ReviewBlock } from "@flow-dev/api/spec";
import { SpecBlock } from "./SpecBlocks";
import { linkContextFor } from "./specReviewContext";
import type { LoadedDocument } from "./useSpecPackage";

type Props = { document: LoadedDocument; documents: LoadedDocument[]; knownTitles: readonly string[]; onOpenDocument: (documentId: string) => void; onLoadMore: (documentId: string) => void };

export function SpecSections({ document, documents, knownTitles, onOpenDocument, onLoadMore }: Props) {
  const sections = buildSections(document.blocks, knownTitles);
  const context = linkContextFor(documents, document.path);
  const byId = new Map<string, ReviewBlock>(document.blocks.map((block) => [block.id, block]));
  return (
    <div className="space-y-5">
      <nav aria-label={`Seções de ${document.path}`}><ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">{sections.map((section) => <li key={section.title}><a className="underline underline-offset-2" href={`#${section.blockIds[0]}`}>{section.title}</a></li>)}</ul></nav>
      {sections.map((section) => (
        <section key={section.title} aria-label={section.title} className="space-y-3">
          {!section.known && <p className="text-xs font-medium text-clarify-ink">Seção adicional</p>}
          {section.blockIds.map((id) => <SpecBlock key={id} block={byId.get(id)!} context={context} onOpenDocument={onOpenDocument} />)}
        </section>
      ))}
      {document.nextCursor && <button type="button" className="text-sm underline underline-offset-2" onClick={() => onLoadMore(document.id)}>{`Carregar mais blocos de ${document.path} (${document.blocks.length} de ${document.totalBlocks})`}</button>}
    </div>
  );
}
