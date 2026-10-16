import { listItemTexts } from "./chunkItems";
import type { Chunk } from "./documentChunks";
import type { Capability } from "./overviewTypes";
import type { CoverageRow, Criterion, Requirement } from "./viewTypes";

const CRITERION_ITEM = /^\**((?:AC|EC)-\d+)\**\s*[:.—–-]?\s*\**\s*/;
const ACCEPTANCE_PREFIX = "AC-";

function criteriaOf(chunk: Chunk | undefined, code: string) {
  const items = chunk?.tokens.flatMap(listItemTexts) ?? [];
  return items.flatMap((text): (Criterion & { acceptance: boolean })[] => {
    const match = CRITERION_ITEM.exec(text);
    return match ? [{ id: `${code}.${match[1]}`, text: text.slice(match[0].length).trim(), acceptance: match[1]!.startsWith(ACCEPTANCE_PREFIX) }] : [];
  });
}

function storyChunk(chunks: Chunk[], capability: Capability) {
  return chunks.find((chunk) => chunk.source.documentId === capability.source.documentId && chunk.source.sectionId === capability.source.sectionId && chunk.title.trim().startsWith(capability.code));
}

export function testsOfStory(coverage: CoverageRow[], code: string) {
  return [...new Set(coverage.filter((row) => row.stories.includes(code)).flatMap((row) => row.tests))];
}

export function requirementsOf(capabilities: Capability[], chunks: Chunk[], coverage: CoverageRow[]): Requirement[] {
  return capabilities.map((capability) => {
    const criteria = criteriaOf(storyChunk(chunks, capability), capability.code);
    const strip = ({ id, text }: Criterion) => ({ id, text });
    return { ...capability, acceptance: criteria.filter((item) => item.acceptance).map(strip), edges: criteria.filter((item) => !item.acceptance).map(strip), tests: testsOfStory(coverage, capability.code) };
  });
}
