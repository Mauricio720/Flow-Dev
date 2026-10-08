import { execFile as execFileCallback, spawn, type ChildProcess } from "node:child_process";
import { chmod, mkdir, mkdtemp, realpath, rm, stat, writeFile } from "node:fs/promises";
import { createServer, request as httpRequest } from "node:http";
import { homedir, tmpdir } from "node:os";
import { delimiter, join, resolve } from "node:path";
import { promisify } from "node:util";
import { COMPOZY_PIN } from "../../application/spec/specPins";
import type { LocalProviderCatalogEntry } from "../../application/database/dao/localConnectorDao";
import type { LoopDefinition } from "../../application/software/compozyControlGateway";
import { LocalExecutionError } from "../../application/services/local-execution/localExecutionErrors";
import { PinnedCompozyControlGateway } from "../spec/compozy/compozyControlGateway";
import { localProviderLines, warmClaudeModelFilter } from "./localProviderOverlay";
import { COMPOZY_VERSION_ARGS, compozyCommand, matchesCompozyPin } from "./pinnedCompozy";
import { CATALOG_DIRECTORY_PREFIX, releaseCatalogDaemon, sweepStaleCatalogDaemons, trackCatalogDaemon } from "./catalogDaemonCleanup";
import { discoverLocalLoops } from "./localLoopDiscovery";
import type { CompozyRequest, CompozyTransport } from "../spec/compozy/compozyTransport";

const execFile = promisify(execFileCallback);
const MAX_MODELS_PER_PROVIDER = 64;
const CATALOG_START_TIMEOUT_MS = 20_000;
const CATALOG_REQUEST_TIMEOUT_MS = 30_000;
const CLEANUP_RETRIES = 5;
const CLEANUP_RETRY_DELAY_MS = 200;

export type LocalCatalog = { providers: LocalProviderCatalogEntry[]; loops: LoopDefinition[] };

/** Discovers only authenticated local providers, their live Compozy model catalogs and the Loops this machine offers. */
export async function discoverLocalCatalog(input: { runtimeRoot: string; environment?: NodeJS.ProcessEnv }): Promise<LocalCatalog> {
  const environment = input.environment ?? process.env;
  await sweepStaleCatalogDaemons();
  const providers = await authenticatedProviders(environment);
  if (!providers.length) return { providers: [], loops: [] };
  const binary = await resolveExecutable(compozyCommand(environment), environment.PATH ?? "");
  if (!binary || !await matchesCompozyPin(binary) || !(await execute(binary, COMPOZY_VERSION_ARGS, { PATH: environment.PATH })).includes(COMPOZY_PIN.version)) throw new LocalExecutionError("runtime_incompatible");

  const directory = await mkdtemp(join(tmpdir(), CATALOG_DIRECTORY_PREFIX));
  await mkdir(input.runtimeRoot, { recursive: true, mode: 0o700 });
  const compozyHome = join(directory, ".compozy");
  const socketPath = join(directory, "daemon.sock");
  const port = await availablePort();
  await mkdir(compozyHome, { recursive: true, mode: 0o700 });
  await chmod(directory, 0o700);
  await writeFile(join(compozyHome, "config.toml"), configText(socketPath, port, providers, input.runtimeRoot), { mode: 0o600 });
  if (providers.includes("claude")) await warmClaudeModelFilter(input.runtimeRoot, environment);
  let child: ChildProcess | undefined;
  try {
    child = spawn(binary, ["daemon", "start", "--foreground"], {
      cwd: input.runtimeRoot,
      env: { PATH: environment.PATH ?? process.env.PATH, HOME: directory, COMPOZY_HOME: compozyHome, TMPDIR: directory },
      stdio: "ignore",
      detached: true,
    });
    if (child.pid) await trackCatalogDaemon(child.pid, directory);
    await waitForSocket(socketPath, child);
    const gateway = new PinnedCompozyControlGateway({ transport: httpTransport(`http://127.0.0.1:${port}`), declaredOpenApiSha256: COMPOZY_PIN.openApiSha256 });
    const catalog: LocalProviderCatalogEntry[] = [];
    for (const providerKind of providers) {
      const listed = await gateway.listModels(providerKind);
      if (!listed.ok) throw new LocalExecutionError(listed.code === "auth_required" ? "runtime_incompatible" : "catalog_changed");
      catalog.push({
        providerId: providerKind,
        providerKind,
        label: providerKind === "codex" ? "Codex local" : "Claude local",
        models: listed.value.slice(0, MAX_MODELS_PER_PROVIDER).map((model) => ({
          modelId: model.modelId,
          displayName: model.displayName,
          selectable: model.selectable,
          unselectableReason: model.unselectableReason,
          reasoningChoices: model.reasoningChoices,
        })),
      });
    }
    return { providers: catalog, loops: await discoverLocalLoops(gateway, directory) };
  } finally {
    if (child?.pid) {
      releaseCatalogDaemon(child.pid);
      try { process.kill(-child.pid, "SIGTERM"); } catch { /* the daemon has already exited */ }
      await Promise.race([new Promise<void>((resolveClose) => child?.once("close", () => resolveClose())), delay(1_000)]);
    }
    await rm(directory, { recursive: true, force: true, maxRetries: CLEANUP_RETRIES, retryDelay: CLEANUP_RETRY_DELAY_MS }).catch(() => undefined);
  }
}

async function authenticatedProviders(environment: NodeJS.ProcessEnv) {
  const result: Array<"codex" | "claude"> = [];
  const definitions = [
    { kind: "codex" as const, binary: "codex", args: ["login", "status", "-c", "cli_auth_credentials_store=file"], extra: { CODEX_HOME: resolve(homedir(), ".codex") } },
    { kind: "claude" as const, binary: "claude", args: ["auth", "status"], extra: { CLAUDE_CONFIG_DIR: resolve(homedir(), ".claude") } },
  ];
  for (const provider of definitions) {
    const executable = await resolveExecutable(provider.binary, environment.PATH ?? process.env.PATH ?? "");
    if (!executable) continue;
    const status = await execute(executable, provider.args, { PATH: environment.PATH ?? process.env.PATH, HOME: homedir(), ...provider.extra }).then(() => true, () => false);
    if (status) result.push(provider.kind);
  }
  return result;
}

function configText(socketPath: string, port: number, providers: Array<"codex" | "claude">, runtimeRoot: string) {
  const lines = ["[daemon]", `socket = ${toml(socketPath)}`, "", "[http]", 'host = "127.0.0.1"', `port = ${port}`];
  for (const providerKind of providers) lines.push(...localProviderLines({ id: providerKind, kind: providerKind, runtimeRoot }));
  return `${lines.join("\n")}\n`;
}

function httpTransport(origin: string): CompozyTransport {
  return (input: CompozyRequest) => new Promise((resolveResponse, reject) => {
    const body = input.body === undefined ? undefined : JSON.stringify(input.body);
    const outgoing = httpRequest(new URL(input.path, origin), {
      method: input.method,
      headers: { accept: "application/json", ...(body ? { "content-type": "application/json", "content-length": String(Buffer.byteLength(body)) } : {}), ...input.headers },
      timeout: CATALOG_REQUEST_TIMEOUT_MS,
    }, (response) => {
      const chunks: Buffer[] = [];
      response.on("data", (chunk: Buffer) => chunks.push(chunk));
      response.on("error", reject);
      response.on("end", () => {
        const text = Buffer.concat(chunks).toString("utf8");
        let parsed: unknown = text;
        try { parsed = text ? JSON.parse(text) : null; } catch { /* gateway rejects non-JSON response */ }
        resolveResponse({ status: response.statusCode ?? 0, body: parsed });
      });
    });
    outgoing.on("timeout", () => outgoing.destroy(new Error("provider_catalog_timeout")));
    outgoing.on("error", reject);
    outgoing.end(body);
  });
}

async function availablePort() {
  const server = createServer();
  await new Promise<void>((resolveListen, reject) => server.once("error", reject).listen(0, "127.0.0.1", resolveListen));
  const address = server.address();
  if (!address || typeof address === "string") throw new LocalExecutionError("runtime_incompatible");
  await new Promise<void>((resolveClose, reject) => server.close((error) => error ? reject(error) : resolveClose()));
  return address.port;
}

async function waitForSocket(path: string, child: ChildProcess) {
  const started = Date.now();
  while (Date.now() - started < CATALOG_START_TIMEOUT_MS) {
    if (await stat(path).then(() => true, () => false)) return;
    if (child.exitCode !== null || child.signalCode !== null) throw new LocalExecutionError("runtime_incompatible");
    await delay(100);
  }
  throw new LocalExecutionError("runtime_incompatible");
}

async function resolveExecutable(name: string, pathValue: string) {
  const paths = name.includes("/") ? [resolve(name)] : pathValue.split(delimiter).filter(Boolean).map((directory) => resolve(directory, name));
  for (const path of paths) {
    try { await realpath(path); return await realpath(path); } catch { /* try the next executable search path */ }
  }
  return null;
}

async function execute(command: string, args: string[], env: NodeJS.ProcessEnv) {
  const result = await execFile(command, args, { env, timeout: 5_000, maxBuffer: 64 * 1024 });
  return `${result.stdout}\n${result.stderr}`;
}

function toml(value: string) { return JSON.stringify(value); }
function delay(ms: number) { return new Promise<void>((resolveDelay) => setTimeout(resolveDelay, ms)); }
