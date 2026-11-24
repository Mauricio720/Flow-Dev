import type { CodexStatus } from "./codexCatalog";

export interface CodexCatalogProbe {
  read(): Promise<CodexStatus>;
}
