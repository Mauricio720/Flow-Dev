import type { ArtifactViewerState } from "../hooks/useArtifactViewer";
import type { ReviewRoundView } from "../reviewContract";
import { ROUNDS_HEADING, ROUND_IN_PROGRESS, VERDICT_LABEL } from "../reviewCopy";

type Props = { rounds: ReviewRoundView[]; viewer: ArtifactViewerState };

const fileNameOf = (path: string) => path.split("/").pop() ?? path;

function ReportLink({ round, viewer }: { round: ReviewRoundView; viewer: ArtifactViewerState }) {
  if (!round.reportPath) return null;
  const name = fileNameOf(round.reportPath);
  if (!round.reportArtifactId) return <span className="font-mono text-xs text-ink-3">{name}</span>;
  const artifactId = round.reportArtifactId;
  return <button type="button" onClick={() => void viewer.open(artifactId)} className="font-mono text-xs text-primary underline underline-offset-2">{name}</button>;
}

export function ReviewRoundList({ rounds, viewer }: Props) {
  if (rounds.length === 0) return null;
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-ink">{ROUNDS_HEADING}</h3>
      <ol aria-label={ROUNDS_HEADING} className="space-y-1.5">
        {[...rounds].sort((first, second) => second.number - first.number).map((round) => (
          <li key={round.number} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-line px-3 py-2 text-sm">
            <span className="font-medium text-ink">Rodada {round.number}</span>
            <span className="text-ink-2">{round.verdict ? VERDICT_LABEL[round.verdict] : ROUND_IN_PROGRESS}</span>
            <ReportLink round={round} viewer={viewer} />
          </li>
        ))}
      </ol>
    </div>
  );
}
