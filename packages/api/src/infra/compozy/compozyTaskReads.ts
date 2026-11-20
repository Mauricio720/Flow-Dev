import type { Compozy, TaskBlockPayload, TaskRunPayload, TaskRunReviewPayload } from "@compozy/client";
import { compozyBlockKinds, compozyReviewOutcomes, type CompozyReviewState, type CompozyTaskState } from "../../application/compozy/compozyGateway";

const RESULT_ENCODING = "base64";

export async function readTaskState(client: Compozy, taskId: string): Promise<CompozyTaskState> {
  const detail = await client.tasks.getTask({ path: { id: taskId } });
  const [{ runs }, { blocks }, { reviews }] = await Promise.all([
    client.tasks.listTaskRuns({ path: { id: taskId } }),
    client.tasks.listTaskBlocks({ path: { id: taskId } }),
    client.tasks.listTaskReviews({ path: { id: taskId } }),
  ]);
  const latestRun = newestRun(runs);
  return { taskId: detail.task.task.id, status: detail.task.task.status, latestRun: latestRun ? runState(latestRun) : null, latestReview: reviewState(reviews), openBlocks: openBlocks(blocks) };
}

export async function readResultText(client: Compozy, runId: string) {
  const chunks: Buffer[] = [];
  let offset = 0;
  for (;;) {
    const page = await client.tasks.readTaskRunResult({ path: { id: runId }, query: { offset } });
    chunks.push(Buffer.from(page.data_base64, RESULT_ENCODING));
    if (page.eof || !page.next_offset || page.next_offset <= offset) break;
    offset = page.next_offset;
  }
  return Buffer.concat(chunks).toString("utf8");
}

function newestRun(runs: TaskRunPayload[]) {
  return [...runs].sort((left, right) => right.attempt - left.attempt || right.queued_at.localeCompare(left.queued_at))[0] ?? null;
}

function runState(run: TaskRunPayload) {
  return { runId: run.id, status: run.status, attempt: run.attempt, sessionId: run.session_id ?? null, error: run.error ?? null };
}

function reviewState(reviews: TaskRunReviewPayload[]): CompozyReviewState | null {
  const latest = [...reviews].sort((left, right) => right.attempt - left.attempt || right.review_round - left.review_round || right.created_at.localeCompare(left.created_at))[0];
  if (!latest) return null;
  const outcome = latest.outcome && compozyReviewOutcomes.includes(latest.outcome) ? latest.outcome : null;
  const summary = outcome ? latest.reason ?? latest.review_text ?? null : null;
  return { reviewId: latest.review_id, runId: latest.run_id, status: latest.status, outcome, summary };
}

function openBlocks(blocks: TaskBlockPayload[]) {
  return blocks.filter((block) => !block.cleared_at && compozyBlockKinds.includes(block.kind)).map((block) => ({ kind: block.kind, reason: block.reason }));
}
