import { XIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { ARTIFACT_CLOSE_LABEL, ARTIFACT_CONTENT_LABEL, ARTIFACT_LOADING, ARTIFACT_META_LABEL } from "../artifactCopy";
import { renderArtifactMarkdown, splitFrontmatter } from "../artifactMarkdown";
import { MARKDOWN_FRAME } from "../markdownFrame";
import type { ArtifactViewerState } from "../hooks/useArtifactViewer";
import { ArtifactVersionPicker } from "./ArtifactVersionPicker";

const CONTENT_FRAME = `max-w-[75ch] ${MARKDOWN_FRAME}`;

function FileMeta({ meta }: { meta: string }) {
  return (
    <details className="group rounded-md border border-line bg-surface">
      <summary className="cursor-pointer px-3 py-2 text-xs text-ink-3 select-none hover:text-ink">{ARTIFACT_META_LABEL}</summary>
      <pre className="overflow-x-auto border-t border-line px-3 py-2 font-mono text-xs leading-relaxed text-ink-2">{meta}</pre>
    </details>
  );
}

export function ArtifactViewer({ viewer, closable = true }: { viewer: ArtifactViewerState; closable?: boolean }) {
  const { current, versions, loading, failure } = viewer;
  if (failure) return <p role="alert" className="text-sm text-destructive">{failure}</p>;
  if (!current) return loading ? <p role="status" className="text-sm text-ink-2">{ARTIFACT_LOADING}</p> : null;
  const { meta, body } = splitFrontmatter(current.content);
  return (
    <article aria-busy={loading} className="overflow-hidden rounded-xl border border-line bg-raised">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-4 py-2.5">
        <h2 className="min-w-0 font-mono text-[13px] font-medium text-ink [overflow-wrap:anywhere]">{current.path}</h2>
        <div className="flex items-center gap-2">
          <ArtifactVersionPicker versions={versions} value={current.version} onChange={(version) => void viewer.selectVersion(version)} />
          {closable ? <Button type="button" size="icon-sm" variant="ghost" aria-label={ARTIFACT_CLOSE_LABEL} onClick={viewer.close}><XIcon /></Button> : null}
        </div>
      </header>
      <div className="space-y-4 px-5 py-5">
        {meta ? <FileMeta meta={meta} /> : null}
        <div aria-label={ARTIFACT_CONTENT_LABEL} className={CONTENT_FRAME} dangerouslySetInnerHTML={{ __html: renderArtifactMarkdown(body) }} />
      </div>
    </article>
  );
}
