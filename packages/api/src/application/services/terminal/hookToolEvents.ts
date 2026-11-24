import path from "node:path";
import type { TerminalEventKind } from "../../terminal/terminalEventKind";
import { COMMAND_SUMMARY_LIMIT, clip } from "./hookSummaryLimits";
import { normalizeSkillName } from "./skillCommand";

export type SummarizedEvent = { kind: TerminalEventKind; summary: string; path: string | null; skill: string | null };

const FILE_EDIT_TOOLS: ReadonlySet<string> = new Set(["Write", "Edit", "MultiEdit", "NotebookEdit"]);
const BASH_TOOL = "Bash";
const SKILL_TOOL = "Skill";
const NEW_LINE = "\n";
const CHANGE_SUMMARIES: Readonly<Record<string, string>> = { add: "Criado", update: "Editado", delete: "Removido", move: "Movido" };

function stringField(source: Record<string, unknown>, key: string): string | null {
  const value = source[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function relativeToCheckout(filePath: string, checkoutPath: string): string {
  if (!path.isAbsolute(filePath)) return filePath;
  const relative = path.relative(checkoutPath, filePath);
  const isInside = relative.length > 0 && !relative.startsWith("..") && !path.isAbsolute(relative);
  return isInside ? relative : filePath;
}

function fileEdit(toolInput: Record<string, unknown>, checkoutPath: string): SummarizedEvent[] {
  const filePath = stringField(toolInput, "file_path") ?? stringField(toolInput, "notebook_path");
  if (!filePath) return [];
  const relative = relativeToCheckout(filePath, checkoutPath);
  const changeKind = stringField(toolInput, "change_kind");
  const summary = changeKind && CHANGE_SUMMARIES[changeKind] ? `${CHANGE_SUMMARIES[changeKind]}: ${relative}` : relative;
  return [{ kind: "file_edit", summary: clip(summary), path: relative, skill: null }];
}

function command(toolInput: Record<string, unknown>): SummarizedEvent[] {
  const line = stringField(toolInput, "command")?.trim().split(NEW_LINE)[0];
  if (!line) return [];
  return [{ kind: "command", summary: clip(line, COMMAND_SUMMARY_LIMIT), path: null, skill: null }];
}

function skill(toolInput: Record<string, unknown>): SummarizedEvent[] {
  const rawName = stringField(toolInput, "skill");
  if (!rawName) return [];
  const name = normalizeSkillName(rawName);
  return [{ kind: "skill", summary: clip(name), path: null, skill: name }];
}

export function summarizeToolEvent(input: { toolName: string; toolInput: Record<string, unknown>; checkoutPath: string }): SummarizedEvent[] {
  if (FILE_EDIT_TOOLS.has(input.toolName)) return fileEdit(input.toolInput, input.checkoutPath);
  if (input.toolName === BASH_TOOL) return command(input.toolInput);
  if (input.toolName === SKILL_TOOL) return skill(input.toolInput);
  return [];
}
