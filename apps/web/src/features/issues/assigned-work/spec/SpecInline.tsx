import { safeSpecLink, type LinkContext } from "@flow-dev/api/spec";
import type { ReactNode } from "react";

const LINK_PATTERN = /\[([^\]]+)\]\(([^)\s]+)\)/g;
type Props = { text: string; context: LinkContext; onOpenDocument?: (documentId: string) => void };

export function SpecInline({ text, context, onOpenDocument }: Props) {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(LINK_PATTERN)) {
    parts.push(text.slice(last, match.index));
    parts.push(<SpecLink key={match.index} label={match[1]!} href={match[2]!} context={context} onOpenDocument={onOpenDocument} />);
    last = match.index + match[0].length;
  }
  parts.push(text.slice(last));
  return <>{parts}</>;
}

function SpecLink({ label, href, context, onOpenDocument }: { label: string; href: string; context: LinkContext; onOpenDocument?: (documentId: string) => void }) {
  const link = safeSpecLink(href, context);
  if (link.kind === "external") return <a href={link.href} target="_blank" rel="noopener noreferrer nofollow" className="underline underline-offset-2">{label}</a>;
  if (link.kind === "document") return <button type="button" className="underline underline-offset-2" onClick={() => onOpenDocument?.(link.documentId)}>{label}</button>;
  if (link.kind === "anchor") return <a href={`#${link.id}`} className="underline underline-offset-2">{label}</a>;
  return <span title="Link inerte">{label}</span>;
}
