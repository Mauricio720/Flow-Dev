import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { CodexProcess } from "./codexProcess";
import { CodexRpcClient } from "./codexRpcClient";
import { CODEX_INITIALIZE_REQUEST } from "./codexSessionStart";

const run = promisify(execFile);
const LOGIN_TIMEOUT_MS = 5_000;
const LOGGED_IN_PREFIX = "Logged in";
export type CodexCatalogTransport = { readCatalog(): Promise<{ loggedIn: boolean; models: unknown[] }> };
export type CodexCatalogTransportFactory = (binary: string) => CodexCatalogTransport;
export type CatalogTransportDeps = { binary: string; env?: NodeJS.ProcessEnv; loginStatus?: (binary: string) => Promise<boolean> };

export class AppServerCodexCatalogTransport implements CodexCatalogTransport {
  constructor(private readonly deps: CatalogTransportDeps) {}

  async readCatalog() {
    const loggedIn = await (this.deps.loginStatus ?? loginStatus)(this.deps.binary);
    if (!loggedIn) return { loggedIn, models: [] };
    const codexProcess = new CodexProcess({ locate: async () => this.deps.binary, has: async () => true }, this.deps.env);
    const child = await codexProcess.start();
    const rpc = new CodexRpcClient(child);
    try { return { loggedIn, models: await readModels(rpc) }; }
    finally { rpc.close(); await codexProcess.terminate(child); }
  }
}

async function readModels(rpc: CodexRpcClient) {
  await rpc.request("initialize", CODEX_INITIALIZE_REQUEST);
  rpc.notify("initialized");
  const result = await rpc.request<{ data?: unknown[] }>("model/list", {});
  return Array.isArray(result.data) ? result.data : [];
}

export async function loginStatus(binary: string) {
  try {
    const { stdout, stderr } = await run(binary, ["login", "status"], { timeout: LOGIN_TIMEOUT_MS, shell: false });
    return loggedInOutput(stdout, stderr);
  } catch {
    return false;
  }
}

function loggedInOutput(...streams: Array<string | undefined>) {
  return streams.some((stream) => stream?.trim().startsWith(LOGGED_IN_PREFIX));
}
