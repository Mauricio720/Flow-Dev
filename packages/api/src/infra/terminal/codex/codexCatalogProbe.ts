import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { CodexCatalogProbe } from "../../../application/terminal/codexCatalogProbe";
import { catalogStatus, versionStatus, type ModelModel } from "../../../application/services/terminal/codexCatalogRules";
import type { CodexStatus } from "../../../application/terminal/codexCatalog";
import type { ToolLocator } from "../../../application/terminal/toolLocator";
import type { CodexCatalogTransportFactory } from "./codexCatalogTransport";

const run = promisify(execFile);
export type CodexProbeDeps = { tools: ToolLocator & { locate(binary: string): Promise<string | null> }; transport: CodexCatalogTransportFactory; now?: () => Date; readVersion?: (binary: string) => Promise<string | null> };

export class LocalCodexCatalogProbe implements CodexCatalogProbe {
  constructor(private readonly deps: CodexProbeDeps) {}

  async read(input?: { codexHome?: string; taskId?: string }): Promise<CodexStatus> {
    const binary = await this.deps.tools.locate("codex");
    if (!binary) return versionStatus(null, false, this.now())!;
    const version = await (this.deps.readVersion ?? readVersion)(binary);
    const rejected = versionStatus(version, true, this.now());
    if (rejected) return rejected;
    try {
      const catalog = await this.deps.transport(binary, input).readCatalog();
      const status = catalogStatus({ version: version!, loggedIn: catalog.loggedIn, models: catalog.models as ModelModel[], now: this.now() });
      return status;
    } catch {
      return { available: false, reason: "Não foi possível consultar o catálogo do Codex.", version, models: [], refreshedAt: this.now().toISOString() };
    }
  }

  private now() {
    return (this.deps.now ?? (() => new Date()))();
  }
}

async function readVersion(binary: string) {
    try {
      const { stdout } = await run(binary, ["--version"], { timeout: 5000, shell: false });
      return /\b(\d+\.\d+\.\d+)\b/.exec(stdout)?.[1] ?? null;
    } catch { return null; }
}
