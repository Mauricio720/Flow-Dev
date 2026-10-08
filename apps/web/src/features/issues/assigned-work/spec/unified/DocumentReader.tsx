"use client";

import { useState } from "react";
import type { ReaderDocument } from "./documentModel";
import { DocumentSection } from "./DocumentSection";
import { PackageMarkdownBlocks } from "./PackageMarkdownBlock";

type Props = { document: ReaderDocument; onOpenDocument: (path: string) => void };
const TOGGLE = "rounded-sm text-sm text-ink-2 underline decoration-line underline-offset-4 hover:text-ink hover:decoration-ink";

function sectionCount(total: number) {
  return total === 1 ? "1 seção" : `${total} seções`;
}

function Unchanged({ sections }: { sections: ReaderDocument["sections"] }) {
  if (sections.length === 0) return null;
  return (
    <details className="group py-4">
      <summary className="cursor-pointer text-sm font-medium text-ink-2 marker:text-ink-3 hover:text-ink">Sem mudanças nesta entrega: {sections.map((section) => section.title).join(", ")}</summary>
      <dl className="mt-3 space-y-2">{sections.map((section) => <div key={section.id} className="grid gap-x-5 sm:grid-cols-[8.5rem_minmax(0,1fr)]"><dt className="text-sm font-medium text-ink">{section.title}</dt><dd className="text-sm leading-6 text-ink-2">{section.plain}</dd></div>)}</dl>
    </details>
  );
}

export function DocumentReader({ document, onOpenDocument }: Props) {
  const [expandAll, setExpandAll] = useState(false);
  const [raw, setRaw] = useState(false);
  const summary = document.sections.find((section) => section.kind === "summary");
  const body = document.sections.filter((section) => section.kind !== "summary" && section.kind !== "empty");
  return (
    <section aria-label={document.label} className="space-y-4">
      <header className="space-y-2">
        <h4 className="text-xl leading-7 font-semibold tracking-[-0.02em] text-balance text-ink">{document.title ?? document.label}</h4>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-3"><span>{sectionCount(document.sections.length)}</span><span className="font-mono">{document.path}</span>{document.meta.map(([name, value]) => <span key={name}>{name}: <span className="text-ink-2">{value}</span></span>)}</p>
        <p className="flex flex-wrap gap-x-4 gap-y-1"><button type="button" aria-pressed={expandAll} onClick={() => setExpandAll(!expandAll)} className={TOGGLE}>{expandAll ? "Recolher seções longas" : "Abrir todas as seções"}</button><button type="button" aria-pressed={raw} onClick={() => setRaw(!raw)} className={TOGGLE}>{raw ? "Voltar à leitura" : "Ver texto original"}</button></p>
      </header>
      {raw ? <pre tabIndex={0} aria-label="Texto original do documento" className="max-h-[32rem] overflow-auto rounded-md bg-surface p-4 font-mono text-[13px] leading-6 whitespace-pre-wrap text-ink-2">{document.source}</pre> : <>
        {document.intro.length > 0 && <div className="space-y-3"><PackageMarkdownBlocks tokens={document.intro} onOpenDocument={onOpenDocument} /></div>}
        {summary && <section aria-label={summary.title} className="space-y-3 [&_p]:text-base [&_p]:text-ink"><h5 className="text-sm font-semibold text-ink">{summary.title}</h5><PackageMarkdownBlocks tokens={summary.tokens} onOpenDocument={onOpenDocument} /></section>}
        <div className="divide-y divide-line border-y border-line">
          {body.map((section) => <DocumentSection key={section.id} section={section} expandAll={expandAll} onOpenDocument={onOpenDocument} />)}
          <Unchanged sections={document.sections.filter((section) => section.kind === "empty")} />
        </div>
      </>}
    </section>
  );
}
