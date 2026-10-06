import type { SpecPackageDetail } from "./specContract";
import { SpecDiagnostics } from "./SpecDiagnostics";
import { SpecSections } from "./SpecSections";
import { documentAt } from "./specReviewContext";
import { sliceSource } from "./specSource";
import { INCOMPLETE_PACKAGE } from "./specCopy";
import type { LoadedDocument } from "./useSpecPackage";
import type { ReviewDiagnostic } from "@flow-dev/api/spec";

const KNOWN_TITLES = ["Overview", "Goals", "User Stories", "Core Features", "Business Rules", "User Experience", "High-Level Technical Constraints", "Non-Goals (Out of Scope)", "Architecture Decision Records", "Open Questions"];
type Props = { detail: SpecPackageDetail; documents: LoadedDocument[]; onOpenDocument: (id: string) => void; onLoadMore: (id: string) => void };
type Story = { id: string; title: string; source: { startByte: number; endByte: number }; acceptance: { id: string; source: { startByte: number; endByte: number } }[]; edges: { id: string; source: { startByte: number; endByte: number } }[] };

function StoryList({ stories, source }: { stories: Story[]; source: string }) {
  return (
    <ul aria-label="Histórias de usuário" className="space-y-2">
      {stories.map((story) => (
        <li key={story.id}>
          <details className="rounded-md border border-line px-3 py-2">
            <summary className="cursor-pointer text-[15px] font-medium">{story.id} · {story.title}</summary>
            <div className="mt-2 space-y-2 text-sm text-ink-2">
              {[...story.acceptance, ...story.edges].map((item) => <pre key={item.id} className="whitespace-pre-wrap"><strong>{item.id}</strong>{"\n"}{sliceSource(source, item.source.startByte, item.source.endByte)}</pre>)}
            </div>
          </details>
        </li>
      ))}
    </ul>
  );
}

export function PrdReview({ detail, documents, onOpenDocument, onLoadMore }: Props) {
  const prd = documentAt(documents, "_prd.md");
  const stories = documentAt(documents, "_user_stories.md");
  if (!prd || !stories || stories.byteCount === 0) return <p role="alert" className="text-sm text-destructive">{INCOMPLETE_PACKAGE}</p>;
  return (
    <div className="space-y-6">
      <SpecDiagnostics diagnostics={detail.diagnostics as ReviewDiagnostic[]} />
      <SpecSections document={prd} documents={documents} knownTitles={KNOWN_TITLES} onOpenDocument={onOpenDocument} onLoadMore={onLoadMore} />
      <StoryList stories={detail.relations.stories as Story[]} source={stories.sourceText} />
      <SpecSections document={stories} documents={documents} knownTitles={[]} onOpenDocument={onOpenDocument} onLoadMore={onLoadMore} />
    </div>
  );
}
