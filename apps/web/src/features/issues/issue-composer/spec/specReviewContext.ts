import type { LinkContext } from "@flow-dev/api/spec";
import type { LoadedDocument } from "./useSpecPackage";

export function linkContextFor(documents: LoadedDocument[], currentPath: string): LinkContext {
  return { currentPath, documents: documents.map((document) => ({ id: document.id, path: document.path })) };
}

export function documentAt(documents: LoadedDocument[], path: string) {
  return documents.find((document) => document.path === path) ?? null;
}

export function documentsWithRole(documents: LoadedDocument[], role: string) {
  return documents.filter((document) => document.role === role);
}
