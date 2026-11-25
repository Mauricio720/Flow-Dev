import type { ReviewRole, ReviewStage } from "./reviewCycleTypes";
import { reportNotNewReason, stageNotUpdatedReason } from "./reviewCopy";
import { requireRelativePath } from "../terminal/taskPlanPrompts";

const REPORT_FILE_PATTERN = /^review-(\d{3,})\.md$/;
const FIRST_REPORT_NUMBER = 1;

export type StageReadInput = {
  role: ReviewRole;
  folder: string;
  stepStartedAt: Date;
  sessionId: string;
  edits: { sessionId: string; path: string; at: Date }[];
  content: string | null;
  previousReportNumber: number | null;
};

export type StageReadResult =
  | { ok: true; stage: ReviewStage; reportPath: string | null; reportNumber: number | null }
  | { ok: false; reason: string };

export function parseStageDocument(content: string | null) {
  const fields: { etapa: string | null; relatorio: string | null } = { etapa: null, relatorio: null };
  for (const line of content?.split(/\r?\n/) ?? []) {
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (key === "etapa") fields.etapa = value || null;
    if (key === "relatorio") fields.relatorio = value || null;
  }
  return fields;
}

function documentPath(folder: string) {
  return folder === "" ? "reviews/etapa.md" : `${folder}/reviews/etapa.md`;
}

function isSafeRelativePath(path: string) {
  try {
    requireRelativePath(path);
    return true;
  } catch {
    return false;
  }
}

function isSafeFolder(folder: string) {
  return folder === "" || isSafeRelativePath(folder);
}

function wasEditedByCurrentSession(input: StageReadInput, path: string) {
  return input.edits.some((edit) => edit.path === path && edit.sessionId === input.sessionId && edit.at.getTime() > input.stepStartedAt.getTime());
}

function stageForRole(role: ReviewRole, stage: string | null): ReviewStage | null {
  if (role === "review" && (stage === "execute" || stage === "aprovada" || stage === "ressalvas")) return stage;
  if (role === "execute" && stage === "review") return stage;
  return null;
}

export function reportNumber(path: string | null, folder: string): number | null {
  if (path === null || !isSafeRelativePath(path) || !isSafeFolder(folder)) return null;
  const prefix = folder === "" ? "reviews/" : `${folder}/reviews/`;
  if (!path.startsWith(prefix)) return null;
  const match = REPORT_FILE_PATTERN.exec(path.slice(prefix.length));
  const number = match ? Number(match[1]) : null;
  return number !== null && Number.isSafeInteger(number) && number >= FIRST_REPORT_NUMBER ? number : null;
}

function isNewReport(input: StageReadInput, path: string | null, number: number | null) {
  if (path === null || number === null || (input.previousReportNumber !== null && number <= input.previousReportNumber)) return false;
  return wasEditedByCurrentSession(input, path);
}

export function readStage(input: StageReadInput): StageReadResult {
  const document = documentPath(input.folder);
  const fields = parseStageDocument(input.content);
  const stage = stageForRole(input.role, fields.etapa);
  const validDocument = isSafeRelativePath(document) && isSafeFolder(input.folder) && wasEditedByCurrentSession(input, document);
  if (!validDocument || stage === null) return { ok: false, reason: stageNotUpdatedReason(input.role, document) };
  if (input.role === "execute") return { ok: true, stage, reportPath: null, reportNumber: null };
  const reportPath = fields.relatorio;
  const number = reportNumber(reportPath, input.folder);
  if (!isNewReport(input, reportPath, number)) return { ok: false, reason: reportNotNewReason(document) };
  return { ok: true, stage, reportPath, reportNumber: number };
}
