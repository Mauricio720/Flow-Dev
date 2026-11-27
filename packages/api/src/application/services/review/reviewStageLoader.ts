import type { ReviewCycleWorkerDao, ReviewSessionTurn } from "../../database/dao/reviewCycleWorkerDao";
import type { ReviewCycleRecord } from "../../database/dao/reviewCycleDao";
import type { CheckoutFileReader } from "../../terminal/checkoutFileReader";
import type { CaptureCandidate } from "../terminal/artifactCapturePlan";
import type { ReviewRole, ReviewStage } from "./reviewCycleTypes";
import { reportNotNewReason } from "./reviewCopy";
import { stageDocumentPath } from "./reviewPrompts";
import { parseStageDocument, readStage, reportNumber } from "./reviewStageReader";

const REVIEW_SKILL = "spec-conformance";

export type ReviewStageLoaderDeps = { cycles: Pick<ReviewCycleWorkerDao, "previousReportPath" | "reportVersionId">; files: CheckoutFileReader; captureStop: (sessionId: string, extra: CaptureCandidate[]) => Promise<void> };
export type LoadedReviewStage = { ok: true; stage: ReviewStage; reportPath: string; reportVersionId: string } | { ok: false; reason: string };
export type LoadedExecutionStage = { ok: true; stage: ReviewStage } | { ok: false; reason: string };
type StageFiles = { content: string | null; modifiedAt: Record<string, Date> };

export class ReviewStageLoader {
  constructor(private readonly deps: ReviewStageLoaderDeps) {}

  async review(cycle: ReviewCycleRecord, turn: ReviewSessionTurn): Promise<LoadedReviewStage> {
    const previous = await this.deps.cycles.previousReportPath({ cycleId: cycle.id, round: cycle.round });
    const result = await this.read({ cycle, turn, role: "review", previousReportNumber: reportNumber(previous, cycle.tasksFolder) });
    const reportPath = result.ok ? result.reportPath : null;
    await this.deps.captureStop(cycle.reviewSessionId!, reportPath ? [{ path: reportPath, skill: REVIEW_SKILL }] : []);
    if (!result.ok) return result;
    const notNew = { ok: false as const, reason: reportNotNewReason(stageDocumentPath(cycle.tasksFolder)) };
    if (!reportPath) return notNew;
    const reportVersionId = await this.deps.cycles.reportVersionId({ taskId: cycle.taskId, path: reportPath });
    return reportVersionId ? { ok: true, stage: result.stage, reportPath, reportVersionId } : notNew;
  }

  async execution(cycle: ReviewCycleRecord, turn: ReviewSessionTurn): Promise<LoadedExecutionStage> {
    const result = await this.read({ cycle, turn, role: "execute", previousReportNumber: null });
    return result.ok ? { ok: true, stage: result.stage } : result;
  }

  private async read(input: { cycle: ReviewCycleRecord; turn: ReviewSessionTurn; role: ReviewRole; previousReportNumber: number | null }) {
    const { cycle, turn, role, previousReportNumber } = input;
    const files = await this.stageFiles(turn.checkoutPath, stageDocumentPath(cycle.tasksFolder), role);
    const sessionId = role === "review" ? cycle.reviewSessionId! : cycle.executeSessionId!;
    return readStage({ role, folder: cycle.tasksFolder, stepStartedAt: cycle.stepStartedAt!, sessionId, edits: turn.edits, ...files, previousReportNumber });
  }

  private async stageFiles(checkoutPath: string, documentPath: string, role: ReviewRole): Promise<StageFiles> {
    const document = await this.deps.files.read({ checkoutPath, path: documentPath });
    if (document.kind !== "content") return { content: null, modifiedAt: {} };
    const modifiedAt: Record<string, Date> = { [documentPath]: document.modifiedAt };
    const reportPath = role === "review" ? parseStageDocument(document.content).relatorio : null;
    const report = reportPath ? await this.deps.files.read({ checkoutPath, path: reportPath }) : null;
    if (reportPath && report?.kind === "content") modifiedAt[reportPath] = report.modifiedAt;
    return { content: document.content, modifiedAt };
  }
}
