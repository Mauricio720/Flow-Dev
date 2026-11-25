import type { ReviewCycleRecord } from "../../database/dao/reviewCycleDao";
import type { SessionLog } from "../terminal/sessionLog";
import type { SystemMessageSender } from "../terminal/systemMessageSender";
import type { ReviewRole } from "./reviewCycleTypes";
import { elapsedMs, logReview } from "./reviewLog";
import { reviewMessageRequestKey } from "./reviewRequestKeys";

export type ReviewMessage = { cycle: ReviewCycleRecord; role: ReviewRole; sessionId: string; content: string; round: number; startedAt: Date };
export type ReviewMessengerDeps = { messages: Pick<SystemMessageSender, "send">; now: () => Date; log: SessionLog };

export class ReviewMessenger {
  constructor(private readonly deps: ReviewMessengerDeps) {}

  async send(message: ReviewMessage) {
    const { cycle, role, sessionId, content, round, startedAt } = message;
    const requestKey = reviewMessageRequestKey({ cycleId: cycle.id, role, round, revision: cycle.revision });
    const result = await this.deps.messages.send({ sessionId, content, requestKey });
    if (!result.created) return;
    logReview(this.deps.log, "step_continued", { cycleId: cycle.id, taskId: cycle.taskId, round, role, sessionId, durationMs: elapsedMs(startedAt, this.deps.now()) });
  }
}
