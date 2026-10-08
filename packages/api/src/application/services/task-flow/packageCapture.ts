import type { FlowUnitOfWork } from "../../database/dao/flowUnitOfWork";
import type { RunRecord } from "../../database/dao/taskFlowDao";
import { validateTaskPackage, validateUnifiedPackage, type PackageFile } from "./artifactValidator";

export interface ArtifactSource {
  read(run: RunRecord): Promise<PackageFile[]>;
}

export type CapturedPackage = { packageId: string; version: number };

export class PackageCapture {
  constructor(private readonly unit: FlowUnitOfWork, private readonly source: ArtifactSource) {}

  async capture(run: RunRecord): Promise<CapturedPackage> {
    const files = await this.source.read(run);
    const validated = run.snapshot.kind === "create_tasks" ? validateTaskPackage(files) : validateUnifiedPackage(files);
    return this.unit.run(async ({ flow }) => {
      await flow.lockTask(run.taskId);
      await flow.packages.supersedeCurrent(run.taskId);
      const stored = await flow.packages.insert({ taskId: run.taskId, sourceRunId: run.id, snapshotId: run.id, format: validated.format, manifest: validated.manifest, files: validated.files });
      return { packageId: stored.id, version: stored.version };
    });
  }
}
