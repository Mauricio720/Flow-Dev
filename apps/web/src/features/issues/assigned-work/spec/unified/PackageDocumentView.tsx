"use client";

import { cn } from "@/lib/utils";
import { DocumentReader } from "./DocumentReader";
import { NAV_LABELS, ORIGINAL_LINK, VIEW_MODE_LABELS, type ViewMode } from "./human-view/humanViewCopy";
import { ViewLinksProvider } from "./human-view/humanViewNav";
import type { NextStep } from "./human-view/nextStep";
import type { PackageProjection } from "./human-view/packageOverview";
import { PackageOverviewPanel } from "./human-view/PackageOverviewPanel";
import { ProductHumanView } from "./human-view/ProductHumanView";
import type { VersionChanges } from "./human-view/ProjectionNotes";
import { TechnicalHumanView } from "./human-view/TechnicalHumanView";
import { useHumanViewState } from "./human-view/useHumanViewState";
import { useItemFocus } from "./human-view/useItemFocus";
import type { ReaderTab } from "./packageReader";

type Props = { tabs: ReaderTab[]; projection?: PackageProjection | null; next?: NextStep | null; changes?: VersionChanges | null; artifactLabel?: string };
type TabOption = { id: string; label: string };
type TabListProps = { label: string; prefix: string; tabs: TabOption[]; selectedId: string; onPick: (id: string) => void };
type ViewControls = ReturnType<typeof useHumanViewState>;
type ContentProps = { tabs: ReaderTab[]; projection: PackageProjection | null; next: NextStep | null; changes: VersionChanges | null; mode: ViewMode; view: ViewControls; openDocument: (path: string) => void };

const PANEL_ID = "package-document-panel";
const MODE_PREFIX = "package-mode";
const DOCUMENT_PREFIX = "package-tab";
const DOCUMENTS_LABEL = "Documentos do pacote";
const SPEC_MODES: ViewMode[] = ["overview", "product", "technical", "original"];
const TASK_MODES: ViewMode[] = ["overview", "original"];

function TabList({ label, prefix, tabs, selectedId, onPick }: TabListProps) {
  return (
    <div role="tablist" aria-label={label} className="flex flex-wrap gap-x-5 gap-y-1 border-b border-line">
      {tabs.map((tab) => (
        <button key={tab.id} id={`${prefix}-${tab.id}`} type="button" role="tab" aria-selected={tab.id === selectedId} aria-controls={PANEL_ID} onClick={() => onPick(tab.id)} className={cn("-mb-px rounded-t-sm border-b-2 px-0.5 pt-1 pb-2.5 text-sm font-medium transition-colors", tab.id === selectedId ? "border-ink text-ink" : "border-transparent text-ink-3 hover:text-ink")}>{tab.label}</button>
      ))}
    </div>
  );
}

function OriginalDocuments({ tabs, view, openDocument }: Pick<ContentProps, "tabs" | "view" | "openDocument">) {
  const docTab = tabs.find((tab) => tab.id === view.state.docTab) ?? tabs[0]!;
  return (
    <div className="space-y-5">
      <TabList label={DOCUMENTS_LABEL} prefix={DOCUMENT_PREFIX} tabs={tabs} selectedId={docTab.id} onPick={view.pickDocTab} />
      {docTab.documents.map((document) => <DocumentReader key={document.id} document={document} onOpenDocument={openDocument} focus={view.state.focus} />)}
    </div>
  );
}

function ModeContent({ tabs, projection, next, changes, mode, view, openDocument }: ContentProps) {
  const specView = projection?.kind === "spec" ? projection.view : null;
  const original = (tabId: string) => <button type="button" onClick={() => view.pickDocTab(tabs.some((tab) => tab.id === tabId) ? tabId : tabs[0]!.id)} className="mt-2 shrink-0 rounded-md px-2.5 py-1.5 text-left text-sm text-ink-3 underline decoration-line underline-offset-4 hover:text-ink">{ORIGINAL_LINK}</button>;
  const shared = { onOpenDocument: openDocument };
  if (mode === "overview" && projection) return <PackageOverviewPanel projection={projection} next={next} changes={changes} onOpenSource={view.openSource} onOpenDocument={openDocument} />;
  if (mode === "product" && specView) return <ProductHumanView view={specView} activeId={view.state.sections.product ?? null} onPick={(id) => view.pickSection("product", id)} footer={original("product")} {...shared} />;
  if (mode === "technical" && specView) return <TechnicalHumanView view={specView} activeId={view.state.sections.technical ?? null} onPick={(id) => view.pickSection("technical", id)} footer={original("technical")} {...shared} />;
  return <OriginalDocuments tabs={tabs} view={view} openDocument={openDocument} />;
}

export function PackageDocumentView({ tabs, projection = null, next = null, changes = null, artifactLabel = "" }: Props) {
  const view = useHumanViewState(projection !== null, projection?.kind === "spec");
  useItemFocus(view.state.itemFocus);
  if (tabs.length === 0) return <p className="text-sm text-ink-2">Esta versão não tem documentos legíveis.</p>;
  const openDocument = (path: string) => {
    const cleanPath = path.replace(/^\.\//, "").split("#")[0];
    const target = tabs.find((tab) => tab.documents.some((document) => document.path === cleanPath));
    if (target) view.pickDocTab(target.id);
  };
  const modes = !projection ? ["original" as const] : projection.kind === "spec" ? SPEC_MODES : TASK_MODES;
  const mode = modes.includes(view.state.mode) ? view.state.mode : modes[0]!;
  return (
    <ViewLinksProvider value={{ openItem: view.openItem, openSource: view.openSource, artifactLabel }}>
      <div className="space-y-5">
        {modes.length > 1 && <TabList label={NAV_LABELS.modes} prefix={MODE_PREFIX} tabs={modes.map((id) => ({ id, label: VIEW_MODE_LABELS[id] }))} selectedId={mode} onPick={(id) => view.pickMode(id as ViewMode)} />}
        <div id={PANEL_ID} role="tabpanel" aria-labelledby={modes.length > 1 ? `${MODE_PREFIX}-${mode}` : undefined} className="min-w-0 space-y-10">
          <ModeContent tabs={tabs} projection={projection} next={next} changes={changes} mode={mode} view={view} openDocument={openDocument} />
        </div>
      </div>
    </ViewLinksProvider>
  );
}
