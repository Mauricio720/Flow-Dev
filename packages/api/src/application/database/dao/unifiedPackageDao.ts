export type PackageStatus = "review_ready" | "approved" | "superseded";
export type PackageFileRole = "spec" | "user_stories" | "dx" | "tests" | "uiux" | "adr" | "tasks_manifest" | "task";
export type PackageFormat = "os_spec_v1" | "os_tasks_v1";

export type PackageFileRecord = { path: string; role: PackageFileRole; sourceText: string; byteCount: number; sha256: string; required: boolean };

export type PackageRecord = {
  id: string;
  taskId: string;
  sourceRunId: string;
  snapshotId: string;
  format: PackageFormat;
  version: number;
  status: PackageStatus;
  manifest: Record<string, unknown>;
  createdAt: Date;
  approvedAt: Date | null;
};

export type NewPackage = { taskId: string; sourceRunId: string; snapshotId: string; format: PackageFormat; manifest: Record<string, unknown>; files: PackageFileRecord[] };
export type ApprovalReceipt = { packageId: string; version: number };

export interface PackageStore {
  insert(input: NewPackage): Promise<PackageRecord>;
  supersedeCurrent(taskId: string): Promise<void>;
  latest(taskId: string): Promise<PackageRecord | null>;
  find(taskId: string, packageId: string): Promise<PackageRecord | null>;
  list(taskId: string): Promise<PackageRecord[]>;
  files(packageId: string): Promise<PackageFileRecord[]>;
  approve(input: { packageId: string; taskId: string; version: number; approverId: string; idempotencyKey: string }): Promise<PackageRecord>;
  findApprovalByKey(taskId: string, idempotencyKey: string): Promise<ApprovalReceipt | null>;
  hasApprovedLatest(taskId: string, format: PackageFormat): Promise<boolean>;
}
