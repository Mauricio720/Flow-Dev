"use client";

import { useState } from "react";
import type { ReaderSection } from "./documentModel";
import { PackageMarkdownBlocks } from "./PackageMarkdownBlock";

type Props = { section: ReaderSection; expandAll: boolean; onOpenDocument: (path: string) => void };
const LONG_SECTION_CHARS = 700;
const PREVIEW_CHARS = 220;
const KIND_MARKS: Partial<Record<ReaderSection["kind"], string>> = { open: "Em aberto", assumption: "Premissa" };

function preview(text: string) {
  return text.length > PREVIEW_CHARS ? `${text.slice(0, PREVIEW_CHARS).trimEnd()}…` : text;
}

export function DocumentSection({ section, expandAll, onOpenDocument }: Props) {
  const [opened, setOpened] = useState(false);
  const long = section.plain.length > LONG_SECTION_CHARS;
  const open = !long || opened || expandAll;
  const mark = KIND_MARKS[section.kind];
  return (
    <section aria-label={section.title} className={section.wide ? "space-y-3 py-4" : "grid gap-x-5 gap-y-2 py-4 sm:grid-cols-[8.5rem_minmax(0,1fr)]"}>
      <div className="space-y-1.5">
        <h5 className="text-sm leading-6 font-semibold text-ink">{section.title}</h5>
        {mark && <span className="inline-block rounded-full bg-clarify-wash px-2 py-0.5 text-xs font-medium text-clarify-ink">{mark}</span>}
      </div>
      <div className="min-w-0 space-y-3">
        {open ? <PackageMarkdownBlocks tokens={section.tokens} onOpenDocument={onOpenDocument} /> : <p className="text-[15px] leading-7 text-ink-2">{preview(section.plain)}</p>}
        {long && !expandAll && <button type="button" aria-expanded={open} onClick={() => setOpened(!opened)} className="rounded-sm text-sm font-medium text-ink underline decoration-line underline-offset-4 hover:decoration-ink">{open ? "Recolher seção" : "Ler seção completa"}</button>}
      </div>
    </section>
  );
}
