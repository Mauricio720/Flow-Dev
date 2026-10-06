import { SPEC_DOCUMENT_MAX_BYTES, SPEC_PACKAGE_MAX_BYTES, SPEC_PACKAGE_MAX_FILES, SPEC_PACKAGE_MAX_TASK_FILES, SPEC_PACKAGE_MAX_TEST_IDS } from "../../services/spec/specLimits";
import type { SpecStage } from "../../services/spec/specContracts";
import { sha256Hex } from "../../services/spec/specPayload";
import { indexPath, missingDocuments } from "../specStageDocuments";
import { parseSpecDocuments } from "./parseSpecDocuments";
import { verifySourceReference } from "./sourceBytes";
import { specPackageIndexSchema, type DocumentInput, type ParsedDocument, type ReviewDiagnostic, type SourceReferenceData, type SpecPackageIndexData } from "./specDocumentTypes";
import { diagramDiagnostic } from "./specReviewModel";
import { validateSpecGraph } from "./validateSpecGraph";
import { validateTestOwnership } from "./validateTestOwnership";

export type ValidateSpecPackageInput = { stage: SpecStage; documents: DocumentInput[]; approvedUpstream: { path: string; sha256: string }[] };
export type SpecPackageValidation = { valid: boolean; diagnostics: ReviewDiagnostic[]; parsed: ParsedDocument[]; index: SpecPackageIndexData | null; openBlockingDecisions: string[] };

const TASK_FILE = /^task_\d{2,3}\.md$/;
const blocking = (code: string, message: string, documentId: string | null = null): ReviewDiagnostic => ({ code, severity: "blocking", documentId, blockId: null, message });

export function validateSpecPackage(input: ValidateSpecPackageInput): SpecPackageValidation {
  const markdown = input.documents.filter((document) => !document.path.endsWith(".json"));
  const parsed = parseSpecDocuments(markdown);
  const diagnostics: ReviewDiagnostic[] = [...limitDiagnostics(input), ...companionDiagnostics(input), ...upstreamDiagnostics(input), ...parsed.flatMap((document) => document.diagnostics)];
  const index = readIndex(input, diagnostics);
  if (index) diagnostics.push(...indexDiagnostics(input, parsed, index));
  diagnostics.push(...parsed.flatMap((document) => document.blocks.map(diagramDiagnostic).filter((item): item is ReviewDiagnostic => item !== null)));
  const openBlockingDecisions = (index?.decisions ?? []).filter((decision) => decision.severity === "blocking" && decision.status === "open").map((decision) => decision.id);
  return { valid: !diagnostics.some((item) => item.severity === "blocking"), diagnostics, parsed, index, openBlockingDecisions };
}

function limitDiagnostics(input: ValidateSpecPackageInput) {
  const total = input.documents.reduce((sum, document) => sum + document.bytes.length, 0);
  const tooLarge = input.documents.some((document) => document.bytes.length > SPEC_DOCUMENT_MAX_BYTES);
  const tasks = input.documents.filter((document) => TASK_FILE.test(document.path)).length;
  const exceeded = tooLarge || total > SPEC_PACKAGE_MAX_BYTES || input.documents.length > SPEC_PACKAGE_MAX_FILES || tasks > SPEC_PACKAGE_MAX_TASK_FILES;
  return exceeded ? [blocking("package_limit", "O pacote excede um limite suportado")] : [];
}

function companionDiagnostics(input: ValidateSpecPackageInput) {
  const present = input.documents.filter((document) => document.bytes.toString("utf8").trim().length > 0).map((document) => document.path);
  const all = input.documents.map((document) => document.path);
  const missing = missingDocuments(input.stage, all).map((path) => blocking("missing_required_document", `Documento obrigatório ausente: ${path}`, path));
  const empty = all.filter((path) => !present.includes(path) && missingDocuments(input.stage, []).includes(path)).map((path) => blocking("empty_required_document", `Documento obrigatório vazio: ${path}`, path));
  return [...missing, ...empty];
}

function upstreamDiagnostics(input: ValidateSpecPackageInput) {
  const approved = new Map(input.approvedUpstream.map((entry) => [entry.path, entry.sha256]));
  return input.documents.filter((document) => approved.has(document.path) && approved.get(document.path) !== sha256Hex(document.bytes)).map((document) => blocking("upstream_modified", `Documento aprovado a montante foi alterado: ${document.path}`, document.path));
}

function readIndex(input: ValidateSpecPackageInput, diagnostics: ReviewDiagnostic[]) {
  const file = input.documents.find((document) => document.path === indexPath(input.stage));
  if (!file) return null;
  const parsed = specPackageIndexSchema.safeParse(parseJson(file.bytes));
  if (parsed.success && parsed.data.stage === input.stage) return parsed.data;
  diagnostics.push(blocking("invalid_index", "O índice do pacote é inválido ou usa uma versão desconhecida", indexPath(input.stage)));
  return null;
}

function parseJson(bytes: Buffer): unknown {
  try { return JSON.parse(bytes.toString("utf8")); } catch { return null; }
}

function references(index: SpecPackageIndexData): SourceReferenceData[] {
  return [...index.stories.flatMap((story) => [story.source, ...story.acceptance.map((item) => item.source), ...story.edges.map((item) => item.source)]), ...index.tests.map((test) => test.source), ...index.tasks.flatMap((task) => [task.scope, task.acceptance]), ...index.decisions.map((decision) => decision.source)];
}

function indexDiagnostics(input: ValidateSpecPackageInput, parsed: ParsedDocument[], index: SpecPackageIndexData): ReviewDiagnostic[] {
  const diagnostics: ReviewDiagnostic[] = [];
  const bytesByPath = new Map(input.documents.map((document) => [document.path, document.bytes]));
  for (const reference of references(index)) {
    const bytes = bytesByPath.get(reference.documentPath);
    if (!bytes || !verifySourceReference(bytes, reference)) diagnostics.push(blocking("interpretation_gap", `Referência de origem inválida em ${reference.documentPath}`, reference.documentPath));
  }
  for (const document of index.documents) if (sha256Hex(bytesByPath.get(document.path) ?? Buffer.alloc(0)) !== document.sha256) diagnostics.push(blocking("index_document_mismatch", `Hash divergente para ${document.path}`, document.path));
  if (index.tests.length > SPEC_PACKAGE_MAX_TEST_IDS) diagnostics.push(blocking("package_limit", "O pacote excede o limite de testes"));
  diagnostics.push(...taskDiagnostics(input, parsed, index));
  return diagnostics;
}

function taskDiagnostics(input: ValidateSpecPackageInput, parsed: ParsedDocument[], index: SpecPackageIndexData): ReviewDiagnostic[] {
  const files = input.documents.map((document) => document.path);
  const tasksStage = input.stage === "tasks";
  const graph = tasksStage ? validateSpecGraph(index.tasks, files) : [];
  const titles = tasksStage ? index.tasks.filter((task) => !titleMatches(parsed.find((document) => document.path === task.path), task.title)).map((task) => blocking("title_mismatch", `Título divergente em ${task.path}`, task.path)) : [];
  return [...graph, ...titles, ...validateTestOwnership(index.tests, index.tasks, tasksStage)];
}

function titleMatches(document: ParsedDocument | undefined, title: string) {
  const heading = document?.blocks.find((block) => block.kind === "heading" && block.level === 1);
  if (!heading) return false;
  const text = heading.content.replace(/^#\s*/, "").trim();
  return text === title || text.endsWith(`: ${title}`);
}
