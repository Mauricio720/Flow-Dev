import type { Token, Tokens } from "marked";
import { plainText, statesNothing, type ReaderDocument } from "./documentModel";

export type OpenPoint = { id: string; documentId: string; documentLabel: string; text: string; detail: Token[] };
type PointDraft = Pick<OpenPoint, "text" | "detail">;

const OPEN_SECTION = "open";
const HEADING = "heading";
const SPACE = "space";
const QUESTION_MARK = "?";

function itemsOf(token: Token): string[] {
  if (token.type === "list" && "items" in token) return (token as Tokens.List).items.map((item) => item.tokens.map(plainText).join(" "));
  if (token.type === "paragraph") return [plainText(token)].filter((text) => text.includes(QUESTION_MARK));
  return [];
}

function groupingDepth(tokens: Token[]) {
  const depths = tokens.filter((token): token is Tokens.Heading => token.type === HEADING).map((heading) => heading.depth);
  return depths.length > 0 ? Math.min(...depths) : null;
}

function draftsOf(tokens: Token[]): PointDraft[] {
  const depth = groupingDepth(tokens);
  const drafts: PointDraft[] = [];
  let grouped: PointDraft | null = null;
  for (const token of tokens) {
    if (token.type === HEADING && (token as Tokens.Heading).depth === depth) {
      grouped = { text: plainText(token), detail: [] };
      drafts.push(grouped);
    } else if (!grouped) {
      drafts.push(...itemsOf(token).map((text) => ({ text, detail: [] })));
    } else if (token.type !== SPACE) {
      grouped.detail.push(token);
    }
  }
  return drafts;
}

export function openPoints(documents: ReaderDocument[]): OpenPoint[] {
  return documents.flatMap((document) => document.sections.flatMap((section) => {
    if (section.kind !== OPEN_SECTION) return [];
    return draftsOf(section.tokens).map((draft) => ({ ...draft, text: draft.text.replace(/\s+/g, " ").trim() })).filter((draft) => draft.text && !statesNothing(draft.text))
      .map((draft, index) => ({ id: `${document.id}:${section.id}:${index}`, documentId: document.id, documentLabel: document.label, ...draft }));
  }));
}
