import type { ReactNode } from "react";
import type { Token, Tokens } from "marked";

type Props = { tokens: Token[]; onOpenDocument?: (path: string) => void };
const PACKAGE_DOCUMENT_LINK = /^(?:\.\/)?(?:_[a-z0-9_-]+\.md|adrs\/adr-\d{3}\.md)(?:#[a-z0-9_-]+)?$/i;

function safeExternalHref(href: string) {
  try {
    const url = new URL(href);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

function Link({ token, onOpenDocument }: { token: Tokens.Link; onOpenDocument?: (path: string) => void }) {
  const external = safeExternalHref(token.href);
  const content = <PackageMarkdownInline tokens={token.tokens} onOpenDocument={onOpenDocument} />;
  if (external) return <a href={external} target="_blank" rel="noopener noreferrer nofollow" className="font-medium text-ink underline decoration-line underline-offset-4 hover:decoration-ink">{content}</a>;
  if (token.href.startsWith("#")) return <a href={token.href} className="font-medium text-ink underline decoration-line underline-offset-4 hover:decoration-ink">{content}</a>;
  if (onOpenDocument && PACKAGE_DOCUMENT_LINK.test(token.href)) return <button type="button" className="font-medium text-ink underline decoration-line underline-offset-4 hover:decoration-ink" onClick={() => onOpenDocument(token.href)}>{content}</button>;
  return <span title="Link inerte">{content}</span>;
}

function InlineToken({ token, onOpenDocument }: { token: Token; onOpenDocument?: (path: string) => void }): ReactNode {
  if (token.type === "strong" && "text" in token) return <strong className="font-semibold text-ink"><PackageMarkdownInline tokens={(token as Tokens.Strong).tokens} onOpenDocument={onOpenDocument} /></strong>;
  if (token.type === "em" && "text" in token) return <em><PackageMarkdownInline tokens={(token as Tokens.Em).tokens} onOpenDocument={onOpenDocument} /></em>;
  if (token.type === "del" && "text" in token) return <del><PackageMarkdownInline tokens={(token as Tokens.Del).tokens} onOpenDocument={onOpenDocument} /></del>;
  if (token.type === "codespan") return <code className="rounded-xs bg-ink/[0.06] px-1 py-0.5 font-mono text-[0.86em] text-ink">{token.text}</code>;
  if (token.type === "link" && "href" in token) return <Link token={token as Tokens.Link} onOpenDocument={onOpenDocument} />;
  if (token.type === "br") return <br />;
  if (token.type === "image") return <span className="text-ink-3">[Imagem: {token.text}]</span>;
  if (token.type === "html") return <code className="font-mono text-[0.86em] text-ink-2">{token.raw}</code>;
  if ("tokens" in token && token.tokens) return <PackageMarkdownInline tokens={token.tokens} onOpenDocument={onOpenDocument} />;
  return "text" in token ? token.text : token.raw;
}

export function PackageMarkdownInline({ tokens, onOpenDocument }: Props) {
  return <>{tokens.map((token, index) => <InlineToken key={`${token.type}-${index}`} token={token} onOpenDocument={onOpenDocument} />)}</>;
}
