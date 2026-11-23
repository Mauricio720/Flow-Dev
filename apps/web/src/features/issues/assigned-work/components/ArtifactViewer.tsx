import { ARTIFACT_CONTENT_LABEL, ARTIFACT_LOADING } from "../artifactCopy";
import { renderArtifactMarkdown } from "../artifactMarkdown";
import { MARKDOWN_FRAME } from "../markdownFrame";
import type { ArtifactViewerState } from "../hooks/useArtifactViewer";
import { ArtifactVersionPicker } from "./ArtifactVersionPicker";

const CONTENT_FRAME = `max-w-[75ch] ${MARKDOWN_FRAME}`;

export function ArtifactViewer({ viewer }: { viewer: ArtifactViewerState }) {
  const { current, versions, loading, failure } = viewer;
  if (failure) return <p role="alert" className="text-sm text-destructive">{failure}</p>;
  if (!current) return loading ? <p role="status" className="text-sm text-ink-2">{ARTIFACT_LOADING}</p> : null;
  return (
    <article aria-busy={loading} className="space-y-3 rounded-md border border-line p-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-mono text-sm font-semibold [overflow-wrap:anywhere]">{current.path}</h2>
        <ArtifactVersionPicker versions={versions} value={current.version} onChange={(version) => void viewer.selectVersion(version)} />
      </header>
      <div aria-label={ARTIFACT_CONTENT_LABEL} className={CONTENT_FRAME} dangerouslySetInnerHTML={{ __html: renderArtifactMarkdown(current.content) }} />
    </article>
  );
}
