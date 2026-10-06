import type { ReviewBlock, ReviewDiagnostic } from "./specDocumentTypes";
import { isUtf8Boundary } from "./sourceBytes";

const gap = (documentId: string, blockId: string | null, message: string): ReviewDiagnostic => ({ code: "interpretation_gap", severity: "blocking", documentId, blockId, message });

export function checkBlockCoverage(bytes: Buffer, blocks: ReviewBlock[], documentId: string): ReviewDiagnostic[] {
  const diagnostics: ReviewDiagnostic[] = [];
  let cursor = 0;
  for (const block of blocks) {
    const inRange = block.startByte >= 0 && block.endByte <= bytes.length && block.startByte < block.endByte && isUtf8Boundary(bytes, block.startByte) && isUtf8Boundary(bytes, block.endByte);
    if (!inRange) { diagnostics.push(gap(documentId, block.id, "Intervalo de origem inválido")); continue; }
    if (block.startByte < cursor) diagnostics.push(gap(documentId, block.id, "Intervalo de origem sobreposto"));
    else if (bytes.subarray(cursor, block.startByte).toString("utf8").trim()) diagnostics.push(gap(documentId, block.id, "Conteúdo material sem bloco representado"));
    cursor = Math.max(cursor, block.endByte);
  }
  if (bytes.subarray(cursor).toString("utf8").trim()) diagnostics.push(gap(documentId, null, "Conteúdo final sem bloco representado"));
  return diagnostics;
}
