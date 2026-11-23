import { ARTIFACT_CONTENT_LABEL, ARTIFACT_LOADING } from "../artifactCopy";
import { renderArtifactMarkdown } from "../artifactMarkdown";
import type { ArtifactViewerState } from "../hooks/useArtifactViewer";
import { ArtifactVersionPicker } from "./ArtifactVersionPicker";

const CONTENT_FRAME = "max-w-[75ch] space-y-3 text-[15px] leading-relaxed text-ink-2 [overflow-wrap:anywhere] [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-ink [&_h4]:font-semibold [&_h4]:text-ink [&_h5]:font-semibold [&_h6]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_pre]:overflow-auto [&_pre]:rounded-md [&_pre]:border [&_pre]:border-line [&_pre]:bg-surface [&_pre]:p-3 [&_code]:font-mono [&_code]:text-[13px] [&_a]:underline";

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
