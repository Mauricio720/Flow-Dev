import type { CompozyGateway, CompozyTaskState } from "../../compozy/compozyGateway";
import type { ExecutionRecord } from "../../database/dao/taskExecutionDao";
import { pullRequestFromResult } from "./pullRequestResult";

const COMPLETED_STATUS = "completed";
const APPROVED_OUTCOME = "approved";

export class ExecutionPullRequests {
  constructor(private readonly gateway: Pick<CompozyGateway, "sessionPullRequest" | "readRunResult">) {}

  async resolve(execution: ExecutionRecord, task: CompozyTaskState) {
    const run = task.latestRun;
    if (run?.status !== COMPLETED_STATUS || task.latestReview?.runId !== run.runId || task.latestReview.outcome !== APPROVED_OUTCOME) return null;
    if (execution.pullRequestUrl) return execution.pullRequestUrl;
    const fromSession = run.sessionId ? await this.gateway.sessionPullRequest({ workspaceId: execution.compozyWorkspaceId, sessionId: run.sessionId }) : null;
    if (fromSession) return fromSession.url;
    return pullRequestFromResult(await this.gateway.readRunResult(run.runId));
  }
}
