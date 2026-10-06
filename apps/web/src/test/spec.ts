import type { ReviewBlock } from "@flow-dev/api/spec";
import type { SpecPackageDetail, SpecSnapshot } from "@/features/issues/issue-composer/spec/specContract";
import type { LoadedDocument } from "@/features/issues/issue-composer/spec/useSpecPackage";
import { A, P, T } from "./tasks";

export const W = "00000000-0000-4000-8000-0000000000a1";
export const V1 = "40000000-0000-4000-8000-000000000001";
export const V2 = "40000000-0000-4000-8000-000000000002";
export const R1 = "30000000-0000-4000-8000-000000000001";
export const Q1 = "50000000-0000-4000-8000-000000000001";
export const HASH1 = "a".repeat(64);
export const HASH2 = "b".repeat(64);
const encoder = new TextEncoder();

export function snapshotOf(patch: Partial<SpecSnapshot> = {}): SpecSnapshot {
  return {
    viewerId: A, specVersion: 1, route: "prd", state: "review", currentStage: "prd",
    eligibility: { canStart: true, reason: null, route: "prd", firstStage: "prd" }, blockers: [],
    permissions: { isAuthor: true, canStart: false, nextStartableStage: null },
    stages: [{ stage: "prd", state: "review", currentAttemptId: R1, currentPackageId: V1, approvedPackageId: null, approval: null }, { stage: "tech_spec", state: "not_started", currentAttemptId: null, currentPackageId: null, approvedPackageId: null, approval: null }, { stage: "tasks", state: "not_started", currentAttemptId: null, currentPackageId: null, approvedPackageId: null, approval: null }],
    attempt: { id: R1, stage: "prd", attemptNumber: 1, kind: "generate", state: "completed", terminalReason: null, createdAt: "2026-10-05T10:00:00.000Z" },
    pendingInteractions: [], packageCount: 1, eventCursor: "cursor.sig", ...patch,
  } as SpecSnapshot;
}

export function blocksOf(source: string, path: string): ReviewBlock[] {
  const parts = source.split(/\n\n+/).filter((part) => part.trim());
  let cursor = 0;
  return parts.map((content, index) => {
    const start = source.indexOf(content, cursor);
    cursor = start + content.length;
    const kind = content.startsWith("#") ? "heading" : content.startsWith("|") ? "table" : content.startsWith("```mermaid") ? "diagram" : content.startsWith("```") ? "code" : "prose";
    const level = kind === "heading" ? (/^#+/.exec(content)?.[0].length ?? 1) : undefined;
    return { id: `b${index + 1}`, documentId: path, sourceHash: content, startByte: encoder.encode(source.slice(0, start)).length, endByte: encoder.encode(source.slice(0, cursor)).length, kind, content, ...(level ? { level } : {}) } as ReviewBlock;
  });
}

export function documentOf(path: string, source: string, role = path.replace(/^_/, "").replace(/\.md$/, "")): LoadedDocument {
  const blocks = blocksOf(source, path);
  return { id: `doc-${path}`, path, role, sha256: HASH1, byteCount: encoder.encode(source).length, sourceText: source, blocks, totalBlocks: blocks.length, nextCursor: null };
}

export function packageOf(patch: Partial<SpecPackageDetail> = {}): SpecPackageDetail {
  return { id: V1, stage: "prd", attemptId: R1, revision: 1, manifestHash: HASH1, captureState: "review_ready", createdAt: "2026-10-05T10:00:00.000Z", packageIndex: {}, diagnostics: [], diffSummary: {}, parentPackageId: null, parentManifestHash: null, isCurrent: true, approval: null, relations: { stories: [], tests: [], tasks: [] }, decisions: [], sections: [], diff: {}, documents: [], ...patch } as SpecPackageDetail;
}

export const PRD_SOURCE = "# PRD\n\n## Overview\n\nExporta relatório.\n\n## Additional constraints\n\nO arquivo MUST expirar.\n";
export const STORIES_SOURCE = "# Histórias\n\n### US-001: Exportar\n\n- AC-1: Given um relatório, when exportar, then baixa o CSV.\n\n- EC-1: relatório vazio → arquivo com cabeçalho.\n";
export const TARGET = { projectId: P, taskId: T };
