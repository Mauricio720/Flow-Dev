import type { ReviewBlock } from "./specDocumentTypes";

export type DiffDocument = { path: string; blocks: ReviewBlock[] };
export type PackageDiff = { addedDocuments: string[]; removedDocuments: string[]; changedDocuments: string[]; addedBlocks: number; removedBlocks: number; changedBlocks: number };

export function specPackageDiff(previous: DiffDocument[], next: DiffDocument[]): PackageDiff {
  const before = new Map(previous.map((document) => [document.path, document]));
  const after = new Map(next.map((document) => [document.path, document]));
  const diff: PackageDiff = { addedDocuments: [], removedDocuments: [], changedDocuments: [], addedBlocks: 0, removedBlocks: 0, changedBlocks: 0 };
  for (const [path, document] of after) {
    const old = before.get(path);
    if (!old) { diff.addedDocuments.push(path); diff.addedBlocks += document.blocks.length; continue; }
    const counts = compareBlocks(old.blocks, document.blocks);
    if (counts.added + counts.removed + counts.changed > 0) diff.changedDocuments.push(path);
    diff.addedBlocks += counts.added;
    diff.removedBlocks += counts.removed;
    diff.changedBlocks += counts.changed;
  }
  for (const [path, document] of before) if (!after.has(path)) { diff.removedDocuments.push(path); diff.removedBlocks += document.blocks.length; }
  return diff;
}

function compareBlocks(before: ReviewBlock[], after: ReviewBlock[]) {
  const shared = Math.min(before.length, after.length);
  let changed = 0;
  for (let index = 0; index < shared; index += 1) if (before[index]!.sourceHash !== after[index]!.sourceHash) changed += 1;
  return { added: Math.max(0, after.length - before.length), removed: Math.max(0, before.length - after.length), changed };
}

export function blockChanges(previous: ReviewBlock[], next: ReviewBlock[]) {
  const before = new Map<string, number>();
  for (const block of previous) before.set(block.sourceHash, (before.get(block.sourceHash) ?? 0) + 1);
  const added: ReviewBlock[] = [];
  for (const block of next) {
    const count = before.get(block.sourceHash) ?? 0;
    if (count > 0) before.set(block.sourceHash, count - 1);
    else added.push(block);
  }
  const remaining = new Map(before);
  const removed = previous.filter((block) => { const count = remaining.get(block.sourceHash) ?? 0; if (count > 0) remaining.set(block.sourceHash, count - 1); return count > 0; });
  return { added, removed };
}
