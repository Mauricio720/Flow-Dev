import { and, asc, desc, eq, ne, sql } from "drizzle-orm";
import type { ApprovalReceipt, NewPackage, PackageFileRecord, PackageRecord, PackageStatus, PackageStore } from "../../../../application/database/dao/unifiedPackageDao";
import type { Database } from "../../client";
import { taskUnifiedPackageApprovals, taskUnifiedPackageFiles, taskUnifiedPackages } from "../../schema";

type PackageRow = typeof taskUnifiedPackages.$inferSelect;
const SUPERSEDED: PackageStatus = "superseded";

function toRecord(row: PackageRow, approvedAt: Date | null): PackageRecord {
  const { id, taskId, sourceRunId, snapshotId, version, manifest, createdAt } = row;
  return { id, taskId, sourceRunId, snapshotId, format: row.format as PackageRecord["format"], version, status: row.status as PackageStatus, manifest, createdAt, approvedAt };
}

export class TaskFlowPackageStore implements PackageStore {
  constructor(private readonly database: Database) {}

  async insert(input: NewPackage) {
    const [current] = await this.database.select({ next: sql<number>`coalesce(max(${taskUnifiedPackages.version}), 0) + 1` }).from(taskUnifiedPackages).where(eq(taskUnifiedPackages.taskId, input.taskId));
    const [row] = await this.database.insert(taskUnifiedPackages).values({ taskId: input.taskId, sourceRunId: input.sourceRunId, snapshotId: input.snapshotId, format: input.format, manifest: input.manifest, version: Number(current?.next ?? 1) }).returning();
    await this.database.insert(taskUnifiedPackageFiles).values(input.files.map((file) => ({ ...file, packageId: row!.id })));
    return toRecord(row!, null);
  }

  async supersedeCurrent(taskId: string) {
    await this.database.update(taskUnifiedPackages).set({ status: SUPERSEDED }).where(and(eq(taskUnifiedPackages.taskId, taskId), ne(taskUnifiedPackages.status, SUPERSEDED)));
  }

  async latest(taskId: string) {
    const [row] = await this.database.select().from(taskUnifiedPackages).where(eq(taskUnifiedPackages.taskId, taskId)).orderBy(desc(taskUnifiedPackages.version)).limit(1);
    return row ? this.withApproval(row) : null;
  }

  async find(taskId: string, packageId: string) {
    const [row] = await this.database.select().from(taskUnifiedPackages).where(and(eq(taskUnifiedPackages.taskId, taskId), eq(taskUnifiedPackages.id, packageId)));
    return row ? this.withApproval(row) : null;
  }

  async list(taskId: string) {
    const rows = await this.database.select().from(taskUnifiedPackages).where(eq(taskUnifiedPackages.taskId, taskId)).orderBy(desc(taskUnifiedPackages.version));
    return Promise.all(rows.map((row) => this.withApproval(row)));
  }

  async files(packageId: string): Promise<PackageFileRecord[]> {
    const rows = await this.database.select().from(taskUnifiedPackageFiles).where(eq(taskUnifiedPackageFiles.packageId, packageId)).orderBy(sql`${taskUnifiedPackageFiles.path} COLLATE "C"`);
    return rows.map(({ packageId: _packageId, ...file }) => ({ ...file, role: file.role as PackageFileRecord["role"] }));
  }

  async approve(input: { packageId: string; taskId: string; version: number; approverId: string; idempotencyKey: string }) {
    await this.database.insert(taskUnifiedPackageApprovals).values({ packageId: input.packageId, taskId: input.taskId, version: input.version, approverUserId: input.approverId, idempotencyKey: input.idempotencyKey });
    const [row] = await this.database.update(taskUnifiedPackages).set({ status: "approved" }).where(eq(taskUnifiedPackages.id, input.packageId)).returning();
    return this.withApproval(row!);
  }

  async findApprovalByKey(taskId: string, idempotencyKey: string): Promise<ApprovalReceipt | null> {
    const [row] = await this.database.select().from(taskUnifiedPackageApprovals).where(and(eq(taskUnifiedPackageApprovals.taskId, taskId), eq(taskUnifiedPackageApprovals.idempotencyKey, idempotencyKey)));
    return row ? { packageId: row.packageId, version: row.version } : null;
  }

  async hasApprovedLatest(taskId: string, format: PackageRecord["format"]) {
    const latest = await this.latest(taskId);
    return latest?.status === "approved" && latest.format === format;
  }

  private async withApproval(row: PackageRow) {
    const [approval] = await this.database.select({ approvedAt: taskUnifiedPackageApprovals.approvedAt }).from(taskUnifiedPackageApprovals).where(eq(taskUnifiedPackageApprovals.packageId, row.id));
    return toRecord(row, approval?.approvedAt ?? null);
  }
}
