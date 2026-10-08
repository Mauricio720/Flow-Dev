import { readDocument, type ReaderDocument } from "./documentModel";
import { splitSpecParts } from "./specParts";
import { DOCUMENT_TABS, SPEC_PART_TABS } from "./unifiedCopy";
import type { PackageDocuments } from "./unifiedContract";

export type ReaderTab = { id: string; label: string; documents: ReaderDocument[] };

const TAB_ORDER = ["spec", "user_stories", "dx", "uiux", "tests", "tasks_manifest", "task", "adr"];
const SPEC_ROLE = "spec";
type SourceDocument = PackageDocuments["documents"][number];

function specTabs(document: SourceDocument): ReaderTab[] {
  return splitSpecParts(document.sourceText).map((part) => {
    const id = part.id === "document" ? SPEC_ROLE : part.id;
    const label = part.id === "document" ? DOCUMENT_TABS[SPEC_ROLE]! : SPEC_PART_TABS[part.id];
    return { id, label, documents: [readDocument({ id, label, path: document.path, source: part.text, dropLeadHeading: part.id !== "document" })] };
  });
}

function roleTab(role: string, documents: SourceDocument[]): ReaderTab {
  const label = DOCUMENT_TABS[role] ?? role;
  return { id: role, label, documents: documents.map((document) => readDocument({ id: document.path, label: documents.length > 1 ? document.path : label, path: document.path, source: document.sourceText })) };
}

export function readPackage(source: PackageDocuments): ReaderTab[] {
  return TAB_ORDER.flatMap((role) => {
    const documents = source.documents.filter((document) => document.role === role);
    if (documents.length === 0) return [];
    return role === SPEC_ROLE ? documents.flatMap(specTabs) : [roleTab(role, documents)];
  });
}
