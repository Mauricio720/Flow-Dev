"use client";

import type { TaskDetail } from "../contract";
import { useArtifactViewer } from "../hooks/useArtifactViewer";
import { useReviewStage, type ReviewStage as ReviewStageState } from "../hooks/useReviewStage";
import { REVIEW_LOADING, REVIEW_STAGE_LABEL } from "../reviewCopy";
import { reviewCanStart, reviewIsFinal } from "../reviewModel";
import { ArtifactViewer } from "./ArtifactViewer";
import { ReviewActions } from "./ReviewActions";
import { ReviewConversation } from "./ReviewConversation";
import { ReviewCycleStatus } from "./ReviewCycleStatus";
import { ReviewRoundList } from "./ReviewRoundList";
import { ReviewStartForm } from "./ReviewStartForm";

type Props = { detail: TaskDetail; reader: boolean; refresh: () => Promise<void>; stage?: ReviewStageState };

const Failure = ({ message }: { message: string }) => <p role="alert" className="text-sm text-destructive">{message}</p>;

export function ReviewStage({ detail, reader, refresh, stage: shared }: Props) {
  const scope = { projectId: detail.task.projectId, taskId: detail.task.id };
  const own = useReviewStage(scope, shared === undefined);
  const stage = shared ?? own;
  const viewer = useArtifactViewer(scope);
  const { view, failure } = stage;
  if (!view) return failure ? <Failure message={failure} /> : <p role="status" className="text-sm text-ink-2">{REVIEW_LOADING}</p>;
  const cycle = view.cycle;
  return (
    <section aria-label={REVIEW_STAGE_LABEL} className="space-y-8">
      {failure ? <Failure message={failure} /> : null}
      <ReviewCycleStatus cycle={cycle} reader={reader} />
      {cycle && !reader ? <ReviewActions cycle={cycle} request={stage.request} /> : null}
      {!reader && reviewCanStart(cycle) ? <ReviewStartForm key={cycle?.id ?? "none"} view={view} onStart={stage.start} /> : null}
      {cycle ? <ReviewRoundList rounds={cycle.rounds} viewer={viewer} /> : null}
      <ArtifactViewer viewer={viewer} />
      {cycle && !reviewIsFinal(cycle.state) ? <ReviewConversation detail={detail} step={cycle.step} reader={reader} onMissing={refresh} /> : null}
    </section>
  );
}
