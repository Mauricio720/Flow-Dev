import type { SpecRoute } from "../../services/spec/specContracts";
import type { ReviewBlock, ReviewDiagnostic } from "./specDocumentTypes";

export type ReviewSection = { title: string; known: boolean; blockIds: string[] };
const SECTION_LEVEL = 2;
const PREAMBLE_TITLE = "Início";
const ACTIVE_DIAGRAM_PAYLOAD = /<\s*script|javascript:|https?:\/\/|onerror\s*=|<\s*iframe/i;

export function buildSections(blocks: ReviewBlock[], knownTitles: readonly string[]): ReviewSection[] {
  const sections: ReviewSection[] = [{ title: PREAMBLE_TITLE, known: true, blockIds: [] }];
  for (const block of blocks) {
    if (block.kind === "heading" && block.level === SECTION_LEVEL) sections.push({ title: block.content.replace(/^#+\s*/, "").trim(), known: knownTitles.includes(block.content.replace(/^#+\s*/, "").trim()), blockIds: [] });
    sections.at(-1)!.blockIds.push(block.id);
  }
  return sections.filter((section) => section.blockIds.length > 0);
}

export function reviewVersionState(viewed: { packageId: string; manifestHash: string }, current: { packageId: string; manifestHash: string } | null) {
  if (!current) return { historical: false, approvalEnabled: false };
  const same = viewed.packageId === current.packageId && viewed.manifestHash === current.manifestHash;
  return { historical: !same, approvalEnabled: same };
}

export function prdRequirement(route: SpecRoute) {
  return route === "prd" ? "required" as const : "unnecessary" as const;
}

export function diagramDiagnostic(block: ReviewBlock): ReviewDiagnostic | null {
  if (block.kind !== "diagram" || !ACTIVE_DIAGRAM_PAYLOAD.test(block.content)) return null;
  return { code: "diagram_render_gap", severity: "blocking", documentId: block.documentId, blockId: block.id, message: "O diagrama contém conteúdo ativo e não pode ser renderizado" };
}
