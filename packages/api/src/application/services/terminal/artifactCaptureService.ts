import type { ArtifactCaptureDao, ArtifactCaptureStore, CaptureSession, TouchedFile } from "../../database/dao/artifactCaptureDao";
import type { ArtifactCaptureTrigger } from "../../terminal/artifactCaptureTrigger";
import type { CheckoutFileReader } from "../../terminal/checkoutFileReader";
import { latestOccurrence, markdownFilesOf, needsNewVersion, sha256Of } from "./artifactCapturePlan";
import { ARTIFACT_FAILURE_MESSAGES } from "./artifactFailureCopy";
import type { TerminalLog } from "./terminalLaunchLog";

export type CaptureSummary = { files: number; created: number; failures: number };
export type ArtifactCaptureDeps = { dao: ArtifactCaptureDao; reader: CheckoutFileReader; log: TerminalLog; now?: () => Date };
type FileOutcome = { created: boolean; failure: string | null };
type CaptureRun = { session: CaptureSession; store: ArtifactCaptureStore; trigger: ArtifactCaptureTrigger; capturedAt: Date };

const EMPTY_SUMMARY: CaptureSummary = { files: 0, created: 0, failures: 0 };

export class ArtifactCaptureService {
  constructor(private readonly deps: ArtifactCaptureDeps) {}

  async capture(input: { sessionId: string; trigger: ArtifactCaptureTrigger }): Promise<CaptureSummary> {
    const capturedAt = (this.deps.now ?? (() => new Date()))();
    const summary = await this.deps.dao.withCaptureLock(input.sessionId, (session, store) => this.captureLocked({ session, store, trigger: input.trigger, capturedAt }));
    return summary ?? EMPTY_SUMMARY;
  }

  private async captureLocked(run: CaptureRun): Promise<CaptureSummary> {
    const touched = markdownFilesOf(await run.store.touchedSince(run.session.id, run.session.lastCaptureAt));
    const outcomes: FileOutcome[] = [];
    for (const file of touched) outcomes.push(await this.captureFile(run, file));
    const watermark = latestOccurrence(touched);
    if (watermark) await run.store.markCaptured(run.session.id, watermark);
    const summary = { files: touched.length, created: outcomes.filter((outcome) => outcome.created).length, failures: outcomes.filter((outcome) => outcome.failure).length };
    this.deps.log.captureDone({ sessionId: run.session.id, ...summary, failureReasons: outcomes.flatMap((outcome) => outcome.failure ?? []).join(",") });
    return summary;
  }

  private async captureFile(run: CaptureRun, file: TouchedFile): Promise<FileOutcome> {
    const read = await this.deps.reader.read({ checkoutPath: run.session.checkoutPath, path: file.path });
    const key = { taskId: run.session.taskId, projectId: run.session.projectId };
    if (read.kind === "outside") return { created: false, failure: null };
    if (read.kind === "failed") {
      await run.store.recordFailure({ ...key, relativePath: read.relativePath, failure: ARTIFACT_FAILURE_MESSAGES[read.reason] });
      return { created: false, failure: read.reason };
    }
    const sha256 = sha256Of(read.content);
    const latest = await run.store.latestVersion(key.taskId, read.relativePath);
    if (!needsNewVersion(latest, sha256)) {
      await run.store.clearFailure(key.taskId, read.relativePath);
      return { created: false, failure: null };
    }
    await run.store.appendVersion({ ...key, relativePath: read.relativePath, skill: file.skill, sessionId: run.session.id, content: read.content, sha256, byteSize: read.byteSize, trigger: run.trigger, capturedAt: run.capturedAt });
    return { created: true, failure: null };
  }
}
