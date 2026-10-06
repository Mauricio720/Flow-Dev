import { posix } from "node:path";
import type { SpecStage } from "../services/spec/specContracts";

export type PermissionTarget = { tool: string; path?: string; command?: string };
export type PermissionScope = { stage: SpecStage; newAdrPattern?: RegExp };

const STAGE_WRITABLE: Record<SpecStage, readonly string[]> = {
  prd: ["_prd.md", "_user_stories.md", ".flow-spec-prd.json"],
  tech_spec: ["_techspec.md", "_tests.md", ".flow-spec-tech_spec.json"],
  tasks: ["_tasks.md", ".flow-spec-tasks.json"],
};
const ADR_PATH = /^adrs\/adr-\d{3,}\.md$/;
const TASK_FILE_PATH = /^task_\d{2,3}\.md$/;
const WRITE_TOOLS = ["write", "edit", "fs_write", "write_file", "edit_file", "apply_patch"];
const FORBIDDEN_COMMANDS = /\b(git\s+(push|commit|remote|config|checkout|reset|clean)|gh\s|curl\s+(-X|--request)\s*(POST|PUT|PATCH|DELETE)|rm\s+-rf|sudo|chmod|npm\s+publish)\b/;

export function classifyPermission(target: PermissionTarget, scope: PermissionScope) {
  if (target.command) return FORBIDDEN_COMMANDS.test(target.command) ? "permission_out_of_scope" as const : "in_scope" as const;
  if (!WRITE_TOOLS.includes(target.tool)) return "in_scope" as const;
  return isStageWritable(target.path, scope.stage) ? "in_scope" as const : "permission_out_of_scope" as const;
}

export function isStageWritable(path: string | undefined, stage: SpecStage) {
  if (!path) return false;
  const normalized = candidatePath(path);
  if (!normalized) return false;
  if (normalized.startsWith("/") || normalized.startsWith("..") || normalized.includes("/../")) return false;
  if (STAGE_WRITABLE[stage].includes(normalized)) return true;
  if (ADR_PATH.test(normalized) && stage !== "tasks") return true;
  return stage === "tasks" && TASK_FILE_PATH.test(normalized);
}

function candidatePath(path: string) {
  const normalized = posix.normalize(path.replaceAll("\\", "/"));
  if (normalized.startsWith("/workspace/candidate/")) return normalized.slice("/workspace/candidate/".length);
  if (normalized.startsWith("candidate/")) return normalized.slice("candidate/".length);
  return normalized.startsWith("/workspace/") ? null : normalized;
}
