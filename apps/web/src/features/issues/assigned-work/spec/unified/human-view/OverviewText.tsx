import { Lexer } from "marked";
import { useMemo } from "react";
import { PackageMarkdownBlocks } from "../PackageMarkdownBlock";
import { PackageMarkdownInline } from "../PackageMarkdownInline";
import { useViewLinks } from "./humanViewNav";
import { SOURCE_PREFIX } from "./overviewCopy";
import type { OpenSource, SourceRef } from "./overviewTypes";

type LinkHandler = (path: string) => void;

export function InlineText({ text, onOpenDocument }: { text: string; onOpenDocument?: LinkHandler }) {
  const tokens = useMemo(() => Lexer.lexInline(text, { gfm: true }), [text]);
  return <PackageMarkdownInline tokens={tokens} onOpenDocument={onOpenDocument} />;
}

export function BlockText({ text, onOpenDocument }: { text: string; onOpenDocument?: LinkHandler }) {
  const tokens = useMemo(() => Lexer.lex(text, { gfm: true }), [text]);
  return <PackageMarkdownBlocks tokens={tokens} onOpenDocument={onOpenDocument} />;
}

export function SourceLink({ source, onOpen }: { source: SourceRef; onOpen: OpenSource }) {
  const artifactLabel = useViewLinks()?.artifactLabel;
  return (
    <p className="text-xs leading-5 text-ink-3">
      {SOURCE_PREFIX}{" "}{artifactLabel && `${artifactLabel} · `}
      <button type="button" onClick={() => onOpen(source)} className="rounded-sm text-left text-ink-2 underline decoration-line underline-offset-4 hover:text-ink hover:decoration-ink">{source.label}</button>
    </p>
  );
}

export function OverviewHeading({ title, count }: { title: string; count?: number }) {
  return <h5 className="text-sm font-semibold text-ink">{title}{count !== undefined && count > 0 && <span className="ml-2 font-normal text-ink-3 tabular-nums">{count}</span>}</h5>;
}
