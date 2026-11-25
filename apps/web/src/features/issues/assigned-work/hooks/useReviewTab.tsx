"use client";

import type { TaskDetail } from "../contract";
import { reviewIsFinal, reviewTabState } from "../reviewModel";
import { REVIEW_TAB_ID, REVIEW_TAB_LABEL, type StageTab } from "../stageTabs";
import { ReviewStage } from "../components/ReviewStage";
import { useReviewStage } from "./useReviewStage";

type Input = { detail: TaskDetail; enabled: boolean; reader: boolean; refresh: () => Promise<void> };

export function useReviewTab({ detail, enabled, reader, refresh }: Input): { tab: StageTab | null; open: boolean } {
  const scope = { projectId: detail.task.projectId, taskId: detail.task.id };
  const stage = useReviewStage(scope, enabled);
  const view = stage.view;
  if (!enabled) return { tab: null, open: false };
  const cycle = view?.cycle ?? null;
  const panel = <ReviewStage detail={detail} reader={reader} refresh={refresh} stage={stage} />;
  return { tab: { id: REVIEW_TAB_ID, label: REVIEW_TAB_LABEL, state: reviewTabState(cycle), panel }, open: cycle !== null && !reviewIsFinal(cycle.state) };
}
