import type { ReviewDiagnostic } from "@flow-dev/api/spec";
import type { SpecPackageDetail } from "./specContract";
import { INCOMPLETE_PACKAGE, PLANNED_NOT_EXECUTED } from "./specCopy";
import { SpecDiagnostics } from "./SpecDiagnostics";
import { SpecSections } from "./SpecSections";
import { documentAt } from "./specReviewContext";
import { sliceSource } from "./specSource";
import type { LoadedDocument } from "./useSpecPackage";

const KNOWN_TITLES = ["Executive Summary", "System Architecture", "Implementation Design", "Integration Points", "Impact Analysis", "Testing Approach", "Development Sequencing", "Monitoring and Observability", "Technical Considerations", "Architecture Decision Records"];
type Props = { detail: SpecPackageDetail; documents: LoadedDocument[]; onOpenDocument: (id: string) => void; onLoadMore: (id: string) => void };
type Test = { id: string; tier: string; references: string[]; gateOwner?: string | null; source: { startByte: number; endByte: number } };

function PlannedTests({ tests, source }: { tests: Test[]; source: string }) {
  return (
    <section aria-label="Testes planejados" className="space-y-2">
      <h3 className="text-[15px] font-semibold">Testes planejados</h3>
      <ul className="space-y-2">
        {tests.map((test) => (
          <li key={test.id} className="rounded-md border border-line px-3 py-2 text-sm">
            <p><strong>{test.id}</strong> · <span>{PLANNED_NOT_EXECUTED}</span> · {test.tier}{test.references.length ? ` · ${test.references.join(", ")}` : ""}</p>
            <pre className="mt-1 whitespace-pre-wrap text-ink-2">{sliceSource(source, test.source.startByte, test.source.endByte)}</pre>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function TechSpecReview({ detail, documents, onOpenDocument, onLoadMore }: Props) {
  const spec = documentAt(documents, "_techspec.md");
  const tests = documentAt(documents, "_tests.md");
  if (!spec || !tests || tests.byteCount === 0) return <p role="alert" className="text-sm text-destructive">{INCOMPLETE_PACKAGE}</p>;
  const gaps = spec.blocks.filter((block) => block.kind === "diagram").flatMap((block) => (diagramGap(block) ? [diagramGap(block)!] : []));
  return (
    <div className="space-y-6">
      <SpecDiagnostics diagnostics={[...(detail.diagnostics as ReviewDiagnostic[]), ...gaps]} />
      <SpecSections document={spec} documents={documents} knownTitles={KNOWN_TITLES} onOpenDocument={onOpenDocument} onLoadMore={onLoadMore} />
      <PlannedTests tests={detail.relations.tests as Test[]} source={tests.sourceText} />
      <SpecSections document={tests} documents={documents} knownTitles={[]} onOpenDocument={onOpenDocument} onLoadMore={onLoadMore} />
    </div>
  );
}

function diagramGap(block: LoadedDocument["blocks"][number]) {
  const unsupported = !/^```mermaid\s+(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie)/.test(block.content);
  return unsupported ? { code: "interpretation_gap", severity: "blocking" as const, documentId: block.documentId, blockId: block.id, message: "Diagrama material não suportado para renderização" } : null;
}
