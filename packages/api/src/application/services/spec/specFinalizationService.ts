import type { TaskSpecFinalizationDao } from "../../database/dao/taskSpecFinalizationDao";
import type { SpecClaim } from "../../database/dao/taskSpecWorkerDao";
import type { PromotionJournal, SpecWorkspaceGateway } from "../../spec/specWorkspaceGateway";
import { TaskError } from "../tasks/taskErrors";
import type { SpecReason } from "./specContracts";

export type FinalizationOutcome = { status: "review_ready" } | { status: "failed"; reason: SpecReason };
const FILESYSTEM_FAILURE = /^(ENOSPC|EIO|EACCES|EPERM|EROFS|EMFILE|EDQUOT)$/;

export class SpecFinalizationService {
  constructor(private readonly dao: TaskSpecFinalizationDao, private readonly workspaces: SpecWorkspaceGateway) {}

  async finalize(claim: SpecClaim, packageId: string): Promise<FinalizationOutcome> {
    await this.dao.assertFinalizing(claim);
    const pkg = await this.dao.loadPackage(packageId);
    if (!pkg.finalizationId) throw new TaskError("capture_failed");
    const finalizationId = pkg.finalizationId;
    try {
      const prior = await this.dao.priorEntries(pkg.workflowId, pkg.stage);
      const journal: PromotionJournal = { record: (step) => this.dao.recordStep(finalizationId, step) };
      const identity = { taskId: claim.taskId, repositoryGithubId: claim.input.repositoryGithubId, attemptId: claim.attemptId, stage: pkg.stage };
      const installed = await this.workspaces.promote({ ...identity, manifest: { stage: pkg.stage, entries: pkg.entries, files: pkg.files, complete: true, missing: [] }, expectedPrior: prior, journal });
      await this.dao.markInstalled(finalizationId);
      await this.dao.complete(claim, { finalizationId, packageId, installedManifestHash: installed.manifestHash });
      return { status: "review_ready" };
    } catch (error) {
      return this.failure(finalizationId, error);
    }
  }

  async restore(input: { taskId: string; repositoryGithubId: string; packageId: string }): Promise<FinalizationOutcome> {
    const pkg = await this.dao.loadPackage(input.packageId);
    const workspaceId = await this.dao.workspaceFor(pkg.workflowId);
    if (!workspaceId) throw new TaskError("workspace_unavailable");
    const prior = await this.dao.priorEntries(pkg.workflowId, pkg.stage);
    const finalizationId = await this.dao.beginRestore({ workflowId: pkg.workflowId, workspaceId, packageId: pkg.id });
    try {
      const journal: PromotionJournal = { record: (step) => this.dao.recordStep(finalizationId, step) };
      const identity = { taskId: input.taskId, repositoryGithubId: input.repositoryGithubId, attemptId: pkg.attemptId, stage: pkg.stage };
      const installed = await this.workspaces.promote({ ...identity, manifest: { stage: pkg.stage, entries: pkg.entries, files: pkg.files, complete: true, missing: [] }, expectedPrior: prior, journal });
      await this.dao.markInstalled(finalizationId);
      await this.dao.completeRestore({ finalizationId, packageId: pkg.id, installedManifestHash: installed.manifestHash, workflowId: pkg.workflowId, stage: pkg.stage });
      return { status: "review_ready" };
    } catch (error) {
      return this.failure(finalizationId, error);
    }
  }

  private async failure(finalizationId: string, error: unknown): Promise<FinalizationOutcome> {
    const reason = failureReason(error);
    if (!reason) throw error;
    await this.dao.fail(finalizationId, reason);
    return { status: "failed", reason };
  }
}

function failureReason(error: unknown): SpecReason | null {
  if (error instanceof TaskError && error.reason === "artifact_conflict") return "artifact_conflict";
  const code = (error as { code?: string }).code;
  return code && FILESYSTEM_FAILURE.test(code) ? "capture_failed" : null;
}
