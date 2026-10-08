import { createHash } from "node:crypto";
import type { PackageFileRecord, PackageFileRole, PackageFormat } from "../../database/dao/unifiedPackageDao";
import { TaskFlowError } from "./taskFlowErrors";

export type PackageFile = { path: string; content: string };
export type ValidatedPackage = { format: PackageFormat; files: PackageFileRecord[]; manifest: Record<string, unknown> };

const SPEC_PATH = "_spec.md";
const FIXED_ROLES: Record<string, PackageFileRole> = { [SPEC_PATH]: "spec", "_user_stories.md": "user_stories", "_dx.md": "dx", "_tests.md": "tests", "_uiux.md": "uiux", "_tasks.md": "tasks_manifest" };
const ALWAYS_REQUIRED = [SPEC_PATH, "_user_stories.md", "_dx.md", "_tests.md"];
const ADR_PATH = /^adrs\/adr-\d{3}\.md$/;
const TASK_PATH = /^task_\d+\.md$/;
const PRODUCT_HEADING = /^#{1,3}\s+.*\bproduct\b/im;
const TECHNICAL_HEADING = /^#{1,3}\s+.*\btechnical\b/im;
const SUMMARY_HEADING = /^#{2,4}\s+(resumo executivo|executive summary)\s*$/im;
const UI_BEARING = /\b(ui|ux|frontend|interface)\b/i;
const MAX_FILES = 64;
const MAX_FILE_BYTES = 1024 * 1024;
const MAX_TOTAL_BYTES = 8 * 1024 * 1024;

const sha256 = (content: string) => createHash("sha256").update(content, "utf8").digest("hex");

function roleOf(path: string): PackageFileRole | null {
  if (FIXED_ROLES[path]) return FIXED_ROLES[path]!;
  if (TASK_PATH.test(path)) return "task";
  return ADR_PATH.test(path) ? "adr" : null;
}

export function isPackagePath(path: string) {
  return roleOf(path) !== null;
}

function specDiagnostics(spec: string) {
  const diagnostics: string[] = [];
  if (!PRODUCT_HEADING.test(spec)) diagnostics.push("spec_missing_product_part");
  if (!TECHNICAL_HEADING.test(spec)) diagnostics.push("spec_missing_technical_part");
  if (!SUMMARY_HEADING.test(spec)) diagnostics.push("spec_missing_executive_summary");
  return diagnostics;
}

function structureDiagnostics(files: PackageFile[]) {
  const diagnostics: string[] = [];
  const paths = files.map((file) => file.path);
  if (files.length > MAX_FILES || new Set(paths).size !== paths.length) diagnostics.push("package_file_count_invalid");
  for (const file of files) {
    if (!roleOf(file.path)) diagnostics.push(`unexpected_file:${file.path}`);
    if (Buffer.byteLength(file.content, "utf8") > MAX_FILE_BYTES || !file.content.trim()) diagnostics.push(`file_size_invalid:${file.path}`);
  }
  if (files.reduce((total, file) => total + Buffer.byteLength(file.content, "utf8"), 0) > MAX_TOTAL_BYTES) diagnostics.push("package_too_large");
  return diagnostics;
}

function missingCompanions(files: PackageFile[]) {
  const spec = files.find((file) => file.path === SPEC_PATH)?.content ?? "";
  const required = UI_BEARING.test(spec) ? [...ALWAYS_REQUIRED, "_uiux.md"] : ALWAYS_REQUIRED;
  return { required, diagnostics: required.filter((path) => !files.some((file) => file.path === path)).map((path) => `missing_required_file:${path}`) };
}

export function validateUnifiedPackage(files: PackageFile[]): ValidatedPackage {
  const { required, diagnostics: missing } = missingCompanions(files);
  const spec = files.find((file) => file.path === SPEC_PATH);
  const diagnostics = [...structureDiagnostics(files), ...missing, ...files.filter((file) => file.path === "_tasks.md" || TASK_PATH.test(file.path)).map((file) => `unexpected_file:${file.path}`), ...(spec ? specDiagnostics(spec.content) : [])];
  if (diagnostics.length > 0) throw new TaskFlowError("package_invalid", undefined, { diagnostics });
  const records = files.map((file): PackageFileRecord => ({ path: file.path, role: roleOf(file.path)!, sourceText: file.content, byteCount: Buffer.byteLength(file.content, "utf8"), sha256: sha256(file.content), required: required.includes(file.path) }));
  const manifest = { format: "os_spec_v1", parts: ["product", "technical"], files: records.map(({ path, role, sha256: digest, byteCount, required: isRequired }) => ({ path, role, sha256: digest, bytes: byteCount, required: isRequired })) };
  return { format: "os_spec_v1", files: records, manifest };
}

export function validateTaskPackage(files: PackageFile[]): ValidatedPackage {
  const diagnostics = structureDiagnostics(files).filter((item) => !item.startsWith("unexpected_file:"));
  const manifest = files.find((file) => file.path === "_tasks.md");
  const tasks = files.filter((file) => TASK_PATH.test(file.path));
  diagnostics.push(...files.filter((file) => file.path !== "_tasks.md" && !TASK_PATH.test(file.path)).map((file) => `unexpected_file:${file.path}`));
  if (!manifest) diagnostics.push("missing_required_file:_tasks.md");
  if (tasks.length === 0) diagnostics.push("missing_task_files");
  if (diagnostics.length > 0) throw new TaskFlowError("package_invalid", undefined, { diagnostics });
  const records = files.map((file): PackageFileRecord => ({ path: file.path, role: file.path === "_tasks.md" ? "tasks_manifest" : "task", sourceText: file.content, byteCount: Buffer.byteLength(file.content, "utf8"), sha256: sha256(file.content), required: true }));
  return { format: "os_tasks_v1", files: records, manifest: { format: "os_tasks_v1", parts: ["tasks"], files: records.map(({ path, role, sha256: digest, byteCount }) => ({ path, role, sha256: digest, bytes: byteCount, required: true })) } };
}
