import type { Token, Tokens } from "marked";
import { PackageMarkdownInline } from "./PackageMarkdownInline";
import { friendlyTitle } from "./sectionTitles";

type LinkHandler = (path: string) => void;
type Props = { token: Token; onOpenDocument?: LinkHandler };
const PROSE = "text-[15px] leading-7 text-ink-2 [overflow-wrap:anywhere]";

function Heading({ token, onOpenDocument }: { token: Tokens.Heading; onOpenDocument?: LinkHandler }) {
  const friendly = friendlyTitle(token.text);
  return <h6 className="pt-2 text-sm font-semibold text-ink first:pt-0">{friendly === token.text.trim() ? <PackageMarkdownInline tokens={token.tokens} onOpenDocument={onOpenDocument} /> : friendly}</h6>;
}

function List({ token, onOpenDocument }: { token: Tokens.List; onOpenDocument?: LinkHandler }) {
  const Tag = token.ordered ? "ol" : "ul";
  return (
    <Tag className={`space-y-1.5 pl-5 ${PROSE} ${token.ordered ? "list-decimal" : "list-disc"}`} start={token.ordered && typeof token.start === "number" ? token.start : undefined}>
      {token.items.map((item, index) => <li key={index} className="pl-1 marker:text-ink-3"><PackageMarkdownBlocks tokens={item.tokens} onOpenDocument={onOpenDocument} /></li>)}
    </Tag>
  );
}

function Table({ token, onOpenDocument }: { token: Tokens.Table; onOpenDocument?: LinkHandler }) {
  return (
    <div role="region" aria-label="Tabela do documento, com rolagem horizontal" tabIndex={0} className="overflow-x-auto rounded-md border border-line">
      <table className="min-w-[30rem] w-full border-collapse text-left text-sm">
        <thead><tr>{token.header.map((cell, index) => <th key={index} scope="col" className="bg-surface px-3 py-2 font-medium text-ink"><PackageMarkdownInline tokens={cell.tokens} onOpenDocument={onOpenDocument} /></th>)}</tr></thead>
        <tbody>{token.rows.map((row, index) => <tr key={index} className="border-t border-line">{row.map((cell, column) => <td key={column} className="px-3 py-2 align-top leading-6 text-ink-2"><PackageMarkdownInline tokens={cell.tokens} onOpenDocument={onOpenDocument} /></td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

export function PackageMarkdownBlock({ token, onOpenDocument }: Props) {
  if (token.type === "heading" && "depth" in token) return <Heading token={token as Tokens.Heading} onOpenDocument={onOpenDocument} />;
  if (token.type === "paragraph" || token.type === "text") return <p className={PROSE}><PackageMarkdownInline tokens={"tokens" in token && token.tokens ? token.tokens : [token]} onOpenDocument={onOpenDocument} /></p>;
  if (token.type === "list" && "items" in token) return <List token={token as Tokens.List} onOpenDocument={onOpenDocument} />;
  if (token.type === "table" && "header" in token) return <Table token={token as Tokens.Table} onOpenDocument={onOpenDocument} />;
  if (token.type === "blockquote" && "tokens" in token && token.tokens) return <blockquote className="space-y-3 border-l border-ink-3 pl-4"><PackageMarkdownBlocks tokens={token.tokens} onOpenDocument={onOpenDocument} /></blockquote>;
  if (token.type === "code") return <pre tabIndex={0} className="overflow-x-auto rounded-md bg-surface p-4 font-mono text-[13px] leading-6 text-ink"><code>{token.text}</code></pre>;
  if (token.type === "html") return <pre className="whitespace-pre-wrap break-words rounded-md bg-surface p-3 font-mono text-[13px] leading-6 text-ink-2">{token.raw}</pre>;
  if (token.type === "hr") return <hr className="border-line" />;
  return null;
}

export function PackageMarkdownBlocks({ tokens, onOpenDocument }: { tokens: Token[]; onOpenDocument?: LinkHandler }) {
  return <>{tokens.map((token, index) => <PackageMarkdownBlock key={`${token.type}-${index}`} token={token} onOpenDocument={onOpenDocument} />)}</>;
}
