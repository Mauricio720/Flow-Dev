import { formatMoment } from "@/lib/tasks/formatMoment";
import type { ExecutionArtifact } from "../executionContract";
import { ARTIFACTS_LIST_LABEL, NO_ARTIFACTS_NOTE, artifactItemLabel } from "../artifactCopy";

type Props = { artifacts: ExecutionArtifact[]; openId: string | null; onOpen: (artifactId: string) => void };

function Failure({ message }: { message: string | null }) {
  return message ? <p role="note" className="mt-1 text-xs text-destructive">{message}</p> : null;
}

function OpenableItem({ artifact, open, onOpen }: { artifact: ExecutionArtifact; open: boolean; onOpen: (artifactId: string) => void }) {
  return (
    <button type="button" aria-pressed={open} onClick={() => onOpen(artifact.id)} className="w-full rounded-md border border-line px-3 py-2 text-left text-sm hover:bg-ink/5 aria-pressed:bg-raised aria-pressed:ring-1 aria-pressed:ring-line">
      <span className="[overflow-wrap:anywhere]">{artifactItemLabel({ path: artifact.path, skill: artifact.skill ?? "", versions: artifact.versions })}</span>
      <time dateTime={artifact.updatedAt} className="ml-2 font-mono text-xs tabular-nums text-ink-3" suppressHydrationWarning>{formatMoment(artifact.updatedAt)}</time>
    </button>
  );
}

export function ArtifactList({ artifacts, openId, onOpen }: Props) {
  if (artifacts.length === 0) return <p className="text-sm text-ink-3">{NO_ARTIFACTS_NOTE}</p>;
  return (
    <ul aria-label={ARTIFACTS_LIST_LABEL} className="space-y-2">
      {artifacts.map((artifact) => (
        <li key={artifact.id}>
          {artifact.versions > 0 ? <OpenableItem artifact={artifact} open={openId === artifact.id} onOpen={onOpen} /> : <p className="px-3 py-2 text-sm [overflow-wrap:anywhere]">{artifact.path}</p>}
          <Failure message={artifact.lastFailure} />
        </li>
      ))}
    </ul>
  );
}
