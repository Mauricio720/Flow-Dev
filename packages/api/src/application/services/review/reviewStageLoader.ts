import type { ReviewCycleWorkerDao, ReviewSessionTurn } from "../../database/dao/reviewCycleWorkerDao";
import type { ReviewCycleRecord } from "../../database/dao/reviewCycleDao";
import type { CheckoutFileReader } from "../../terminal/checkoutFileReader";
import type { ReviewRole, ReviewStage } from "./reviewCycleTypes";
import { reportNotNewReason } from "./reviewCopy";
import { stageDocumentPath } from "./reviewPrompts";
import { readStage, reportNumber } from "./reviewStageReader";

export type ReviewStageLoaderDeps = { cycles: Pick<ReviewCycleWorkerDao, "previousReportPath" | "reportVersionId">; files: CheckoutFileReader; captureStop: (sessionId: string) => Promise<void> };
export type LoadedReviewStage = { ok: true; stage: ReviewStage; reportPath: string; reportVersionId: string } | { ok: false; reason: string };
export type LoadedExecutionStage = { ok: true; stage: ReviewStage } | { ok: false; reason: string };

export class ReviewStageLoader {
  constructor(private readonly deps: ReviewStageLoaderDeps) {}

  async review(cycle: ReviewCycleRecord, turn: ReviewSessionTurn): Promise<LoadedReviewStage> {
    await this.deps.captureStop(cycle.reviewSessionId!);
    const previous = await this.deps.cycles.previousReportPath({ cycleId: cycle.id, round: cycle.round });
    const result = await this.read({ cycle, turn, role: "review", previousReportNumber: reportNumber(previous, cycle.tasksFolder) });
    if (!result.ok) return result;
    const notNew = { ok: false as const, reason: reportNotNewReason(stageDocumentPath(cycle.tasksFolder)) };
    if (!result.reportPath) return notNew;
    const reportVersionId = await this.deps.cycles.reportVersionId({ taskId: cycle.taskId, path: result.reportPath });
    return reportVersionId ? { ok: true, stage: result.stage, reportPath: result.reportPath, reportVersionId } : notNew;
  }

  async execution(cycle: ReviewCycleRecord, turn: ReviewSessionTurn): Promise<LoadedExecutionStage> {
    const result = await this.read({ cycle, turn, role: "execute", previousReportNumber: null });
    return result.ok ? { ok: true, stage: result.stage } : result;
  }

  private async read(input: { cycle: ReviewCycleRecord; turn: ReviewSessionTurn; role: ReviewRole; previousReportNumber: number | null }) {
    const { cycle, turn, role, previousReportNumber } = input;
    const file = await this.deps.files.read({ checkoutPath: turn.checkoutPath, path: stageDocumentPath(cycle.tasksFolder) });
    const sessionId = role === "review" ? cycle.reviewSessionId! : cycle.executeSessionId!;
    return readStage({ role, folder: cycle.tasksFolder, stepStartedAt: cycle.stepStartedAt!, sessionId, edits: turn.edits, content: file.kind === "content" ? file.content : null, previousReportNumber });
  }
}
