import type { CodexStatus } from "./codexCatalog";

export interface CodexCatalogProbe {
  read(input?: { codexHome?: string; taskId?: string }): Promise<CodexStatus>;
}
