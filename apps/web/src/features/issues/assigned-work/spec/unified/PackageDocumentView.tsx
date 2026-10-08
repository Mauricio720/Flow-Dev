"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { DocumentReader } from "./DocumentReader";
import type { ReaderTab } from "./packageReader";

const PANEL_ID = "package-document-panel";

export function PackageDocumentView({ tabs }: { tabs: ReaderTab[] }) {
  const [pickedId, setPickedId] = useState<string | null>(null);
  const selected = tabs.find((tab) => tab.id === pickedId) ?? tabs[0];
  if (!selected) return <p className="text-sm text-ink-2">Esta versão não tem documentos legíveis.</p>;
  const openDocument = (path: string) => {
    const cleanPath = path.replace(/^\.\//, "").split("#")[0];
    const target = tabs.find((tab) => tab.documents.some((document) => document.path === cleanPath));
    if (target) setPickedId(target.id);
  };
  return (
    <div className="space-y-5">
      <div role="tablist" aria-label="Documentos do pacote" className="flex flex-wrap gap-x-5 gap-y-1 border-b border-line">
        {tabs.map((tab) => (
          <button key={tab.id} id={`package-tab-${tab.id}`} type="button" role="tab" aria-selected={tab.id === selected.id} aria-controls={PANEL_ID} onClick={() => setPickedId(tab.id)} className={cn("-mb-px rounded-t-sm border-b-2 px-0.5 pt-1 pb-2.5 text-sm font-medium transition-colors", tab.id === selected.id ? "border-ink text-ink" : "border-transparent text-ink-3 hover:text-ink")}>{tab.label}</button>
        ))}
      </div>
      <div id={PANEL_ID} role="tabpanel" aria-labelledby={`package-tab-${selected.id}`} className="min-w-0 space-y-10">
        {selected.documents.map((document) => <DocumentReader key={document.id} document={document} onOpenDocument={openDocument} />)}
      </div>
    </div>
  );
}
