import type { RunRecord } from "../../database/dao/taskFlowTypes";
import type { TaskFlowDao } from "../../database/dao/taskFlowDao";
import { DIRECT_ACTION_KIND } from "../task-flow/directExecution";
import { PULL_REQUEST_ACTION_KIND } from "../task-flow/pullRequestAction";
import { DIRECT_PARTIAL_REASON } from "./directOutcome";
import { MAX_ACCEPTED_PENDING } from "./localProtocol";

type TaskSource = { issueNumber: number; title: string; bodyMarkdown: string };
type PublishedTaskInput = { kind: string; taskId: string; source: TaskSource; runs?: Pick<TaskFlowDao["runs"], "list"> };

const RUN_LOOKUP_LIMIT = 50;
const WARNING_ACTIVITY = "warning";

/** What the direct execution left pending when the operator accepted its partial result; publication only follows a succeeded action, so a partial last run means it was accepted. */
export function acceptedPendingOf(runs: RunRecord[]) {
  const latestDirect = runs.find((run) => run.snapshot.kind === DIRECT_ACTION_KIND);
  if (latestDirect?.terminalCode !== DIRECT_PARTIAL_REASON) return null;
  const activity = latestDirect.activity;
  if (activity?.kind !== WARNING_ACTIVITY || !activity.preview.trim()) return null;
  return activity.preview.trim().slice(0, MAX_ACCEPTED_PENDING);
}

export async function publishedTask(input: PublishedTaskInput): Promise<TaskSource & { acceptedPending?: string }> {
  if (input.kind !== PULL_REQUEST_ACTION_KIND || !input.runs) return input.source;
  const { items } = await input.runs.list({ taskId: input.taskId, limit: RUN_LOOKUP_LIMIT });
  const pending = acceptedPendingOf(items);
  return pending ? { ...input.source, acceptedPending: pending } : input.source;
}
