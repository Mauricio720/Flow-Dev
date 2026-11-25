import { requireInside, requireRelativePath } from "../terminal/taskPlanPrompts";
import { CAVEATS_PROMPT, EXECUTE_CONTINUATION, EXECUTE_INITIAL_PROMPT, PARTIAL_REVIEW_NOTE, REVIEW_CONTINUATION, REVIEW_INITIAL_PROMPT } from "./reviewCopy";

function safeFolder(folder: string) {
  return folder === "" ? "" : requireRelativePath(folder);
}

function documentFor(folder: string) {
  return folder === "" ? "reviews/etapa.md" : `${safeFolder(folder)}/reviews/etapa.md`;
}

function reportFor(folder: string, reportPath: string) {
  const safeReport = requireRelativePath(reportPath);
  return requireInside(safeFolder(folder), safeReport);
}

function renderReviewPrompt(template: string, folder: string, partial: boolean) {
  const safeFolderPath = safeFolder(folder);
  const pasta = safeFolderPath || "raiz do checkout";
  const reportPath = safeFolderPath ? `${safeFolderPath}/reviews` : "reviews";
  const prompt = template.replaceAll("{pasta}", pasta).replaceAll("{reportFolder}", reportPath).replaceAll("{documento}", documentFor(folder));
  return partial ? `${prompt} ${PARTIAL_REVIEW_NOTE}` : prompt;
}

export function stageDocumentPath(folder: string) {
  return documentFor(folder);
}

export function reviewInitialPrompt(input: { folder: string; partial: boolean }) {
  return renderReviewPrompt(REVIEW_INITIAL_PROMPT, input.folder, input.partial);
}

export function reviewContinuation(input: { folder: string; partial: boolean }) {
  return renderReviewPrompt(REVIEW_CONTINUATION, input.folder, input.partial);
}

export function executeInitialPrompt(input: { folder: string; reportPath: string }) {
  return EXECUTE_INITIAL_PROMPT.replaceAll("{caminho}", reportFor(input.folder, input.reportPath)).replaceAll("{documento}", documentFor(input.folder));
}

export function executeContinuation(input: { folder: string; reportPath: string }) {
  return EXECUTE_CONTINUATION.replaceAll("{caminho}", reportFor(input.folder, input.reportPath)).replaceAll("{documento}", documentFor(input.folder));
}

export function caveatsPrompt(input: { folder: string; reportPath: string }) {
  return CAVEATS_PROMPT.replaceAll("{caminho}", reportFor(input.folder, input.reportPath)).replaceAll("{documento}", documentFor(input.folder));
}
