import type { GenerationEnvelope, IssueAuthorGateway } from "../application/issue-author/issueAuthorGateway";
import type { WorkerClaim, WorkerOperationDao } from "../application/database/dao/taskOperationDao";
import { keepLabels, keepPriorityPoints } from "../application/services/tasks/draftMerge";
import type { IssueDraft } from "../application/services/tasks/taskContracts";
import { TaskError } from "../application/services/tasks/taskErrors";
import type { TaskPublicationWorkerController } from "./taskPublicationWorkerController";
import type { TaskPlanningWorkerController } from "./taskPlanningWorkerController";

const QUEUE_POLL_MS = 5_000;
const MAX_WORKER_SLOTS = 2;
const HEARTBEAT_MS = 15_000;

type SlotCursor = { next: number };
const WORK_KINDS = ["generate", "publish", "plan"] as const;

export class TaskWorkerController {
  private readonly sharedCursor: SlotCursor = { next: 0 };
  constructor(private readonly operations: WorkerOperationDao, private readonly author: IssueAuthorGateway, private readonly workerId = crypto.randomUUID(), private readonly publications?: TaskPublicationWorkerController, private readonly planning?: TaskPlanningWorkerController) {}

  async tick(cursor: SlotCursor = this.sharedCursor, signal?: AbortSignal) {
    for (let offset = 0; offset < WORK_KINDS.length; offset += 1) {
      const index = (cursor.next + offset) % WORK_KINDS.length;
      if (!await this.runKind(WORK_KINDS[index]!, signal)) continue;
      cursor.next = (index + 1) % WORK_KINDS.length;
      return true;
    }
    return false;
  }

  private async runKind(kind: (typeof WORK_KINDS)[number], signal?: AbortSignal) {
    if (kind === "publish") return (await this.publications?.tick()) ?? false;
    if (kind === "plan") return (await this.planning?.tick(signal)) ?? false;
    const claim = await this.operations.claim(this.workerId);
    if (!claim) return false;
    await this.execute(claim);
    return true;
  }

  async run(signal: AbortSignal) {
    const cursor: SlotCursor = { next: 0 };
    while (!signal.aborted) {
      const processed = await this.tick(cursor, signal);
      if (!processed) await delay(QUEUE_POLL_MS, signal);
    }
  }

  async runPool(signal: AbortSignal) {
    await Promise.all(Array.from({ length: MAX_WORKER_SLOTS }, () => this.run(signal)));
  }

  private async execute(claim: WorkerClaim) {
    let heartbeatFailure: unknown;
    const timer = setInterval(() => { void this.operations.heartbeat(claim).catch((error) => { heartbeatFailure = error; }); }, HEARTBEAT_MS);
    try {
      const input = await this.operations.generationInput(claim);
      const result = await this.author.generate(input);
      if (heartbeatFailure) throw heartbeatFailure;
      await this.operations.completeGeneration(claim, withAuthorChoices(result, input.currentDraft));
    } catch (error) {
      console.error("[tasks-worker] generation failed", claim.operationId, failureDetail(error));
      await this.operations.failGeneration(claim, safeReason(error));
    } finally { clearInterval(timer); }
  }
}

function withAuthorChoices(envelope: GenerationEnvelope, currentDraft: IssueDraft | null): GenerationEnvelope {
  if (envelope.result.status !== "draft_ready") return envelope;
  return { ...envelope, result: { ...envelope.result, draft: keepLabels(keepPriorityPoints(envelope.result.draft, currentDraft), currentDraft) } };
}
function failureDetail(error: unknown) { return error instanceof TaskError ? `${error.reason}${error.cause instanceof Error ? `: ${error.cause.message}` : ""}` : error; }
function safeReason(error: unknown) { return error instanceof TaskError ? error.reason : "provider_unavailable"; }
function delay(milliseconds: number, signal: AbortSignal) { return new Promise<void>((resolve) => { const timer = setTimeout(resolve, milliseconds); signal.addEventListener("abort", () => { clearTimeout(timer); resolve(); }, { once: true }); }); }
