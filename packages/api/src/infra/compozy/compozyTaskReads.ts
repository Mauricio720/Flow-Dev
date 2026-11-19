import type { Compozy, TaskBlockPayload, TaskRunPayload, TaskRunReviewPayload } from "@compozy/client";
import { compozyBlockKinds, compozyReviewOutcomes, type CompozyTaskState } from "../../application/compozy/compozyGateway";

const RESULT_ENCODING = "base64";

export async function readTaskState(client: Compozy, taskId: string): Promise<CompozyTaskState> {
  const detail = await client.tasks.getTask({ path: { id: taskId } });
  const [{ runs }, { blocks }] = await Promise.all([client.tasks.listTaskRuns({ path: { id: taskId } }), client.tasks.listTaskBlocks({ path: { id: taskId } })]);
  const latestRun = newestRun(runs);
  const reviews = latestRun ? (await client.tasks.listTaskRunReviews({ path: { id: latestRun.id } })).reviews : [];
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
  return { runId: run.id, status: run.status, attempt: run.attempt, sessionId: run.session_id ?? null };
}

function reviewState(reviews: TaskRunReviewPayload[]): CompozyTaskState["latestReview"] {
  const decided = reviews.filter((review) => review.outcome && compozyReviewOutcomes.includes(review.outcome));
  const latest = decided.sort((left, right) => right.review_round - left.review_round || right.created_at.localeCompare(left.created_at))[0];
  if (!latest?.outcome) return null;
  return { outcome: latest.outcome, summary: latest.reason ?? latest.review_text ?? null };
}

function openBlocks(blocks: TaskBlockPayload[]) {
  return blocks.filter((block) => !block.cleared_at && compozyBlockKinds.includes(block.kind)).map((block) => ({ kind: block.kind, reason: block.reason }));
}
