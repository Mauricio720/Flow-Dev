import { marked, type Token, type Tokens } from "marked";
import { friendlyTitle } from "./sectionTitles";

export type SectionKind = "summary" | "open" | "assumption" | "empty" | "regular";
export type ReaderSection = { id: string; title: string; kind: SectionKind; tokens: Token[]; plain: string; wide: boolean };
export type ReaderDocument = { id: string; label: string; path: string; title: string | null; meta: [string, string][]; intro: Token[]; sections: ReaderSection[]; source: string };
export type DocumentInput = { id: string; label: string; path: string; source: string; dropLeadHeading?: boolean };

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
// Nested YAML (lists, indented maps) has no place in the one-line metadata strip, so only top-level scalar fields are read.
const TOP_LEVEL_FIELD = /^([A-Za-z_][\w.-]*):\s*(\S.*)$/;
const SUMMARY_TITLE = /^(resumo executivo|executive summary|overview|visão geral|resumo|summary)$/i;
const OPEN_TITLE = /(open|unresolved) questions|(perguntas|questões|pontos) (em aberto|abert[ao]s)|\bpendências/i;
const ASSUMPTION_TITLE = /assumptions|premissas|suposições/i;
const EMPTY_TEXT = /^(não aplicável|not applicable|n\/a|nenhuma?\b|none\b|não há\b)/i;
const EMPTY_MAX_CHARS = 220;
const WIDE_TYPES = ["table", "code"];

export function statesNothing(text: string) {
  return EMPTY_TEXT.test(text.trim());
}

export function plainText(token: Token): string {
  if (token.type === "list" && "items" in token) return (token as Tokens.List).items.map((item) => item.tokens.map(plainText).join(" ")).join(" ");
  if ("tokens" in token && Array.isArray(token.tokens)) return token.tokens.map(plainText).join("");
  return "text" in token ? token.text : "";
}

function frontmatterOf(source: string) {
  const match = FRONTMATTER.exec(source);
  if (!match) return { meta: [] as [string, string][], body: source };
  const fields = (match[1] ?? "").split(/\r?\n/).flatMap((line) => { const field = TOP_LEVEL_FIELD.exec(line); return field ? [[field[1]!, field[2]!.trim()] as [string, string]] : []; });
  const meta = [...new Map(fields).entries()];
  return { meta, body: source.slice(match[0].length) };
}

function sectionDepth(headings: Tokens.Heading[]) {
  if (headings.filter((heading) => heading.depth === 1).length > 1) return 1;
  return headings.some((heading) => heading.depth === 2) ? 2 : 0;
}

function kindOf(title: string, plain: string, tokens: Token[], summaryTaken: boolean): SectionKind {
  if (OPEN_TITLE.test(title)) return "open";
  if (ASSUMPTION_TITLE.test(title)) return "assumption";
  if (!summaryTaken && SUMMARY_TITLE.test(title.trim())) return "summary";
  const simple = tokens.every((token) => token.type === "paragraph" || token.type === "space");
  return simple && plain.length <= EMPTY_MAX_CHARS && EMPTY_TEXT.test(plain) ? "empty" : "regular";
}

function toSection(heading: Tokens.Heading, tokens: Token[], index: number, summaryTaken: boolean): ReaderSection {
  const plain = tokens.map(plainText).join(" ").replace(/\s+/g, " ").trim();
  return { id: `s${index}`, title: friendlyTitle(heading.text), kind: kindOf(heading.text, plain, tokens, summaryTaken), tokens, plain, wide: tokens.some((token) => WIDE_TYPES.includes(token.type)) };
}

export function readDocument(input: DocumentInput): ReaderDocument {
  const { meta, body } = frontmatterOf(input.source);
  const lexed = marked.lexer(body, { gfm: true });
  const tokens = input.dropLeadHeading && lexed[0]?.type === "heading" ? lexed.slice(1) : lexed;
  const depth = sectionDepth(tokens.filter((token): token is Tokens.Heading => token.type === "heading"));
  const starts = tokens.flatMap((token, index) => token.type === "heading" && (token as Tokens.Heading).depth === depth ? [index] : []);
  const head = tokens.slice(0, starts[0] ?? tokens.length);
  const lead = head.find((token) => token.type === "heading") as Tokens.Heading | undefined;
  const sections: ReaderSection[] = [];
  starts.forEach((start, position) => {
    const summaryTaken = sections.some((section) => section.kind === "summary");
    sections.push(toSection(tokens[start] as Tokens.Heading, tokens.slice(start + 1, starts[position + 1] ?? tokens.length), position, summaryTaken));
  });
  return { id: input.id, label: input.label, path: input.path, title: lead?.depth === 1 ? lead.text : null, meta, intro: head.filter((token) => token !== lead || lead.depth !== 1), sections, source: input.source };
}
