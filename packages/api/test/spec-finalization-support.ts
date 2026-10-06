import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DrizzleTaskSpecCaptureDao } from "../src/infra/database/dao/spec/drizzleTaskSpecCaptureDao";
import { DrizzleTaskSpecFinalizationDao } from "../src/infra/database/dao/spec/drizzleTaskSpecFinalizationDao";
import { DrizzleTaskSpecWorkerDao } from "../src/infra/database/dao/spec/drizzleTaskSpecWorkerDao";
import { SpecCaptureService } from "../src/application/services/spec/specCaptureService";
import { SpecFinalizationService } from "../src/application/services/spec/specFinalizationService";
import type { SpecWorkspaceGateway } from "../src/application/spec/specWorkspaceGateway";
import { GitSpecWorkspaceGateway } from "../src/infra/spec/workspace/gitWorkspaceGateway";
import { planCheckout } from "../src/infra/spec/workspace/checkoutPlan";
import { revisedManifest } from "./spec-fixtures";
import { specTask } from "./spec-support";
import { startWorkflow } from "./spec-seed";

export const finalizationRoots: string[] = [];

export async function harness() {
  const setup = await specTask("tech_spec");
  const started = await startWorkflow(setup, "tech_spec");
  const root = await mkdtemp(join(tmpdir(), "spec-final-"));
  finalizationRoots.push(root);
  const gateway = new GitSpecWorkspaceGateway({ root, remoteBase: "http://unused", git: async () => ({ stdout: "" }), resolveIdentity: async () => ({ githubId: "202" }), maxCheckoutBytes: 1e9, fetchTimeoutMs: 1000 });
  const workerDao = new DrizzleTaskSpecWorkerDao(setup.database);
  const claim = (await workerDao.claim({ owner: "w", now: new Date(), maxActive: 2 }))!;
  await workerDao.markFinalizing(claim);
  await workerDao.bindWorkspace(claim, { repositoryGithubId: "202", repositoryNodeId: "R_202", baseCommit: "a".repeat(40), runnerId: "r", checkoutLocator: root, slug: `flow-${setup.taskId}` });
  const workspaceId = (await workerDao.workspaceId(claim))!;
  const capture = new SpecCaptureService(new DrizzleTaskSpecCaptureDao(setup.database));
  const prepare = (files: Record<string, string> = {}, mutateIndex?: (index: Record<string, unknown>) => void) => capture.capture({ workflowId: started.workflowId, attemptId: started.attemptId, stage: "tech_spec", manifest: revisedManifest("tech-spec-route", "tech_spec", files, mutateIndex), upstream: [], finalization: { workspaceId, commandId: null } });
  const finalization = (workspaces: SpecWorkspaceGateway = gateway) => {
    const service = new SpecFinalizationService(new DrizzleTaskSpecFinalizationDao(setup.database), workspaces);
    const reopen = () => setup.database.execute(`UPDATE task_spec_attempts SET state = 'finalizing', finished_at = NULL` as never);
    return { finalize: async (...args: Parameters<typeof service.finalize>) => { await reopen(); return service.finalize(...args); }, restore: service.restore.bind(service) };
  };
  const canonical = planCheckout({ root, repositoryGithubId: "202", taskId: setup.taskId }).canonicalPath;
  return { setup, started, claim, prepare, finalization, gateway, canonical, workspaceId, capture };
}
export const crashing = (gateway: SpecWorkspaceGateway, when: "before" | "after"): SpecWorkspaceGateway => ({ ...gateway, promote: async (input) => { if (when === "before") throw new Error("process died"); await gateway.promote(input); throw new Error("process died"); } } as SpecWorkspaceGateway);

