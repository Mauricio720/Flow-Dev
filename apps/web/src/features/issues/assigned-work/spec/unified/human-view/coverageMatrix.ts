import type { Tokens } from "marked";
import { cellsOf, listItemTexts, splitLead } from "./chunkItems";
import { chunksTitled, firstParagraph, type Chunk } from "./documentChunks";
import type { CoverageRow, TestCase, TestKind } from "./viewTypes";

const TEST_ID = /\b(?:UT|IT|E2E)-\d+\b/g;
const LEADING_TEST_ID = /^((?:UT|IT|E2E)-\d+)\b\s*[:—–-]*\s*/;
const STORY_REF = /\bUS-\d+\b/g;
const MATRIX_TITLE = /matriz|coverage matrix/i;
const NO_CHECK = /^[—–-]?$/;
const KIND_PREFIX = /^\(`?[\w-]+`?\)\s*[:—–-]*\s*/;
const FIRST_CLAUSE = /^(.+?[.;])(\s|$)/;
const KINDS: Record<string, TestKind> = { UT: "unit", IT: "integration", E2E: "e2e" };

function unique(values: string[]) {
  return [...new Set(values)];
}

function rowsOf(table: Tokens.Table, chunk: Chunk): CoverageRow[] {
  return cellsOf(table).rows.filter((row) => row[0]).map((row, index) => {
    const checks = row.slice(2).filter((cell) => !NO_CHECK.test(cell));
    return {
      id: `${chunk.source.sectionId}:coverage:${index}`,
      origin: row[0]!,
      behavior: row[1] ?? "",
      tests: unique(checks.join(" ").match(TEST_ID) ?? []),
      otherChecks: checks.filter((cell) => !cell.match(TEST_ID)),
      stories: unique(row[0]!.match(STORY_REF) ?? []),
      source: chunk.source,
    };
  });
}

export function coverageRows(chunks: Chunk[]): CoverageRow[] {
  return chunksTitled(chunks, MATRIX_TITLE).flatMap((chunk) => chunk.tokens.filter((token): token is Tokens.Table => token.type === "table").flatMap((table) => rowsOf(table, chunk)));
}

function kindOf(id: string): TestKind {
  return KINDS[id.split("-")[0] ?? ""] ?? "other";
}

function caseOf(head: string, rest: string, chunk: Chunk): TestCase[] {
  const match = LEADING_TEST_ID.exec(head);
  if (!match) return [];
  const afterId = head.slice(match[0].length).replace(KIND_PREFIX, "").trim();
  const detail = rest.replace(KIND_PREFIX, "").trim();
  const title = afterId || (FIRST_CLAUSE.exec(detail)?.[1] ?? detail) || match[1]!;
  return [{ id: match[1]!, kind: kindOf(match[1]!), title, source: chunk.source }];
}

function listedCases(chunk: Chunk): TestCase[] {
  return chunk.tokens.flatMap(listItemTexts).flatMap((raw) => {
    const { lead, rest } = splitLead(raw);
    return lead ? caseOf(lead, rest, chunk) : caseOf(raw, "", chunk);
  });
}

export function testCases(chunks: Chunk[]): TestCase[] {
  const cases = chunks.flatMap((chunk) => {
    const titled = caseOf(chunk.title, firstParagraph(chunk) ?? "", chunk);
    return titled.length > 0 ? titled : listedCases(chunk);
  });
  return [...new Map(cases.map((item) => [item.id, item])).values()];
}
