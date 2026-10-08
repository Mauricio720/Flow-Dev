import { createHash } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import { chmod, cp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { ExecutionRequest } from "../../application/services/task-flow/actionExecutor";
import type { RunLauncher } from "../spec/compozy/snapshotRunExecutor";
import { MANAGED_AGENT_NAME } from "../../application/spec/specPins";
import { snapshotProviders } from "../spec/runProviders";
import { localProviderLines, type LocalProviderKind } from "./localProviderOverlay";
import { LocalExecutionError } from "../../application/services/local-execution/localExecutionErrors";
import { LocalCheckoutRegistry } from "./localCheckoutRegistry";
import { PrivateRegistryStore } from "./privateRegistry";

const SOCKET_FILE = "daemon.sock";
const SOCKET_WAIT_ATTEMPTS = 100;
const SOCKET_WAIT_MS = 200;
const RESOURCE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../runtime");
const SKILL_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../resources/spec");

type ChildRecord = { child: ChildProcess; pid: number };

/** Starts the pinned Compozy daemon directly against the user's registered checkout. */
export class NativeCompozyRunLauncher implements RunLauncher {
  private readonly children = new Map<string, ChildRecord>();

  constructor(private readonly options: {
    registry: PrivateRegistryStore;
    runtimeRoot: string;
    executable?: string;
    resourcesRoot?: string;
    skillsRoot?: string;
    environment?: NodeJS.ProcessEnv;
    spawnProcess?: typeof spawn;
    onSpawn?: (child: ChildProcess, runId: string) => void;
  }) {}

  async start(request: ExecutionRequest) {
    const snapshot = request.snapshot;
    if (snapshot.workspace.kind !== "local" || !snapshot.workspace.target) throw new LocalExecutionError("path_invalid", { cause: "A execução não aponta para um projeto local vinculado." });
    const target = snapshot.workspace.target;
    const registry = await this.options.registry.read();
    const entry = registry.entries.find((candidate) => candidate.handle === target.checkoutHandle);
    if (!entry) throw new LocalExecutionError("path_invalid", { cause: "O checkout vinculado não está registrado nesta máquina. Refaça o vínculo em Projeto local." });
    const checkout = new LocalCheckoutRegistry(this.options.registry, []);
    const repositoryPath = await checkout.rootFor(entry.handle, entry.key);
    const runDirectory = join(this.options.runtimeRoot, "runs", request.run.id);
    const socketDirectory = join(runDirectory, "socket");
    const socketPath = join(socketDirectory, SOCKET_FILE);
    const home = join(runDirectory, "home");
    const compozyHome = join(home, ".compozy");
    await mkdir(socketDirectory, { recursive: true, mode: 0o700 });
    await mkdir(compozyHome, { recursive: true, mode: 0o700 });
    await chmod(runDirectory, 0o700).catch(() => undefined);
    if (await exists(socketPath)) return { socketPath };

    const resourcesRoot = this.options.resourcesRoot ?? RESOURCE_ROOT;
    const skillsRoot = this.options.skillsRoot ?? SKILL_ROOT;
    await this.installResources(compozyHome, resourcesRoot, skillsRoot);
    await this.writeConfiguration(compozyHome, socketPath, snapshot);
    await mkdir(join(runDirectory, "tmp"), { recursive: true, mode: 0o700 });
    const child = (this.options.spawnProcess ?? spawn)(this.options.executable ?? this.options.environment?.FLOW_COMPOZY_BIN ?? "compozy", ["daemon", "start", "--foreground"], {
      cwd: repositoryPath,
      env: {
        PATH: this.options.environment?.PATH ?? process.env.PATH,
        HOME: home,
        COMPOZY_HOME: compozyHome,
        TMPDIR: join(runDirectory, "tmp"),
      },
      stdio: "ignore",
      detached: true,
    });
    const pid = await new Promise<number>((resolvePid, reject) => {
      child.once("error", () => reject(new LocalExecutionError("runtime_incompatible", { cause: "Não foi possível iniciar o processo do CompozyOS local." })));
      child.once("spawn", () => child.pid ? resolvePid(child.pid) : reject(new LocalExecutionError("runtime_incompatible", { cause: "O processo do CompozyOS local não informou um identificador." })));
    });
    child.unref();
    this.children.set(request.run.id, { child, pid });
    this.options.onSpawn?.(child, request.run.id);
    await writeFile(join(runDirectory, "pid"), `${pid}\n`, { mode: 0o600 });
    await waitForSocket(socketPath, child);
    return { socketPath };
  }

  async stop(runId: string) {
    const runDirectory = join(this.options.runtimeRoot, "runs", runId);
    const childRecord = this.children.get(runId);
    let pid = childRecord?.pid;
    if (!pid) {
      const value = await readFile(join(runDirectory, "pid"), "utf8").catch(() => "");
      if (/^\d+\n?$/.test(value)) pid = Number(value.trim());
    }
    if (pid) {
      try { process.kill(-pid, "SIGTERM"); } catch { /* already stopped */ }
      if (childRecord) await new Promise<void>((resolveStop) => {
        const timer = setTimeout(resolveStop, 1500);
        childRecord.child.once("close", () => { clearTimeout(timer); resolveStop(); });
      });
    }
    this.children.delete(runId);
    await rm(runDirectory, { recursive: true, force: true });
  }

  private async installResources(compozyHome: string, resourcesRoot: string, skillsRoot: string) {
    const agentSource = join(resourcesRoot, "agents", MANAGED_AGENT_NAME, "AGENT.md");
    const agentTarget = join(compozyHome, "agents", MANAGED_AGENT_NAME, "AGENT.md");
    await mkdir(dirname(agentTarget), { recursive: true, mode: 0o700 });
    await cp(agentSource, agentTarget).catch(() => { throw new LocalExecutionError("runtime_incompatible", { cause: `O agente ${MANAGED_AGENT_NAME} não foi encontrado na instalação do conector.` }); });
    const skillTarget = join(compozyHome, "skills");
    await mkdir(skillTarget, { recursive: true, mode: 0o700 });
    for (const skill of ["flow-spec-prd", "flow-spec-techspec", "flow-spec-tasks"]) {
      await cp(join(skillsRoot, skill), join(skillTarget, skill), { recursive: true }).catch(() => { throw new LocalExecutionError("runtime_incompatible", { cause: `A skill ${skill} não foi encontrada na instalação do conector.` }); });
    }
  }

  private async writeConfiguration(compozyHome: string, socketPath: string, snapshot: ExecutionRequest["snapshot"]) {
    const providers = snapshotProviders(snapshot);
    if (!providers.length || providers.some((provider) => !["codex", "claude"].includes(provider.kind) || !/^[a-z0-9][a-z0-9_-]{0,63}$/.test(provider.overlayId))) throw new LocalExecutionError("runtime_incompatible", { cause: "O provedor desta execução não é suportado pelo conector local." });
    const port = 20_000 + (Number.parseInt(createHash("sha256").update(socketPath).digest("hex").slice(0, 6), 16) % 30_000);
    const lines = [`[daemon]`, `socket = ${tomlString(socketPath)}`, ``, `[http]`, `host = "127.0.0.1"`, `port = ${port}`];
    for (const provider of providers) lines.push(...localProviderLines({ id: provider.overlayId, kind: provider.kind as LocalProviderKind, runtimeRoot: this.options.runtimeRoot }));
    await writeFile(join(compozyHome, "config.toml"), `${lines.join("\n")}\n`, { mode: 0o600 });
  }
}

async function waitForSocket(path: string, child: ChildProcess) {
  for (let attempt = 0; attempt < SOCKET_WAIT_ATTEMPTS; attempt += 1) {
    if (await exists(path)) return;
    if (child.exitCode !== null || child.signalCode !== null) throw new LocalExecutionError("runtime_incompatible", { cause: "O CompozyOS local encerrou antes de ficar pronto." });
    await new Promise((resolveWait) => setTimeout(resolveWait, SOCKET_WAIT_MS));
  }
  throw new LocalExecutionError("runtime_incompatible", { cause: "O CompozyOS local não ficou pronto a tempo." });
}

const exists = (path: string) => stat(path).then(() => true, () => false);
const tomlString = (value: string) => JSON.stringify(value);
