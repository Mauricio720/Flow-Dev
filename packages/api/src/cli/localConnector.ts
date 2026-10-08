import { randomBytes, randomUUID } from "node:crypto";
import { hostname } from "node:os";
import { stdout } from "node:process";
import { pathToFileURL } from "node:url";
import { dirname, join, resolve } from "node:path";
import { ensurePaired } from "./localConnectorPairing";
import { LocalCheckoutRegistry } from "../infra/local-execution/localCheckoutRegistry";
import { LocalCommandJournal } from "../infra/local-execution/localCommandJournal";
import { PrivateRegistryStore } from "../infra/local-execution/privateRegistry";
import { validateLocalCommand, type LocalEvent } from "../application/services/local-execution/localProtocol";
import { localPayloadHash } from "../application/services/local-execution/localHash";
import { inspectLocalReadiness, LocalNativeCommandAgent } from "../infra/local-execution/localNativeCommandAgent";
import { openInBrowser } from "../infra/local-execution/browserLauncher";
import { pickLocalFolder } from "../infra/local-execution/localFolderPicker";
import { LocalLinkRequestWorker, type LinkRequestClaim, type LinkRequestSettlement } from "../infra/local-execution/localLinkRequestWorker";
import { discoverLocalCatalog, type LocalCatalog } from "../infra/local-execution/localProviderCatalog";

type Fetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
type PairingResponse = { pairingId: string; code: string; expiresAt: string; confirmationUrl: string };
type PairingExchange = { state: "pending" } | { state: "complete"; machineId: string; token: string; expiresAt: string };

export class LocalConnectorClient {
  constructor(private readonly fetcher: Fetcher = fetch, private readonly discoverCatalog: typeof discoverLocalCatalog = discoverLocalCatalog) {}

  async pair(server: string, label = hostname(), onConfirmation: (url: string, code: string) => void = (url, code) => stdout.write(`Código de confirmação: ${code}\nConfirme no navegador: ${url}\n`), store = new PrivateRegistryStore(defaultRegistryPath()), sleep: (ms: number) => Promise<void> = delay) {
    const origin = requireTrustedOrigin(server);
    const registry = await store.read();
    if (registry.pendingRevocation) throw new Error("remote_revocation_pending");
    const pollingSecret = randomToken();
    const requestKey = randomUUID();
    const created = await this.request<PairingResponse>(origin, "/api/local-connector/pairings", { protocolVersion: 1, label, pollingSecret });
    await store.write({ ...registry, pendingPairing: { server: origin, pairingId: created.pairingId, pollingSecret, requestKey, expiresAt: created.expiresAt } });
    onConfirmation(created.confirmationUrl, created.code);
    while (Date.parse(created.expiresAt) > Date.now()) {
      const result = await this.request<PairingExchange>(origin, "/api/local-connector/pairings/exchange", { pairingId: created.pairingId, pollingSecret, requestKey });
      if (result.state === "complete") {
        const current = await store.read();
        await store.write({ ...current, pendingPairing: undefined, pendingHeartbeat: undefined, machine: { server: origin, machineId: result.machineId, label, token: result.token, expiresAt: result.expiresAt, credentialGeneration: 1 } });
        return { machineId: result.machineId, confirmationUrl: created.confirmationUrl, expiresAt: result.expiresAt };
      }
      await sleep(1500);
    }
    throw new Error("pairing_expired");
  }

  async link(input: { projectId: string; path: string; repositoryOwner?: string; repositoryName?: string; label: string; expectedRevision: number; allowedRoots: string[]; store?: PrivateRegistryStore }) {
    const store = input.store ?? new PrivateRegistryStore(defaultRegistryPath());
    const registry = await store.read();
    if (!registry.machine) throw new Error("machine_unpaired");
    const checkout = await new LocalCheckoutRegistry(store, input.allowedRoots).link({ path: input.path, ...(input.repositoryOwner && input.repositoryName ? { expectedRepository: `${input.repositoryOwner}/${input.repositoryName}` } : {}), label: input.label });
    const [repositoryOwner, repositoryName] = checkout.repository.split("/");
    if (!repositoryOwner || !repositoryName) throw new Error("repository_mismatch");
    const result = await this.request<{ linkId: string; revision: number }>(registry.machine.server, "/api/local-connector/links", {
      protocolVersion: 1, projectId: input.projectId, checkoutHandle: checkout.handle, checkoutKey: checkout.key,
      repositoryOwner, repositoryName, safeLabel: input.label,
      expectedRevision: input.expectedRevision, requestKey: randomUUID(),
    }, registry.machine.token);
    return { linkId: result.linkId, revision: result.revision, checkoutHandle: checkout.handle };
  }

  async claimLinkRequest(store = new PrivateRegistryStore(defaultRegistryPath())) {
    const machine = (await store.read()).machine;
    if (!machine) throw new Error("not_paired");
    const response = await this.request<{ request: LinkRequestClaim | null }>(machine.server, "/api/local-connector/link-requests/claim", { protocolVersion: 1 }, machine.token);
    return response.request;
  }

  async settleLinkRequest(settlement: LinkRequestSettlement, store = new PrivateRegistryStore(defaultRegistryPath())) {
    const machine = (await store.read()).machine;
    if (!machine) throw new Error("not_paired");
    return this.request<{ settled: boolean }>(machine.server, "/api/local-connector/link-requests/settle", { protocolVersion: 1, ...settlement }, machine.token);
  }

  async heartbeat(store = new PrivateRegistryStore(defaultRegistryPath())) {
    let registry = await store.read();
    if (!registry.machine) throw new Error("not_paired");
    const { providers: providerCatalog, loops: loopCatalog } = await this.localCatalog(store);
    registry = await store.read();
    if (!registry.machine) throw new Error("not_paired");
    const pairedMachine = registry.machine;
    const requestKey = registry.pendingHeartbeat?.requestKey ?? randomUUID();
    if (!registry.pendingHeartbeat) {
      registry = { ...registry, pendingHeartbeat: { requestKey } };
      await store.write(registry);
    }
    const response = await this.request<{ credentialGeneration: number; credentialExpiresAt: string; credentialRotation?: { token: string; generation: number; expiresAt: string } }>(pairedMachine.server, "/api/local-connector/heartbeat", {
      protocolVersion: 1, capabilities: ["commands", "events", ...providerCatalog.map((provider) => `provider-${provider.providerKind}`)], catalogRevision: 1, providerCatalog, loopCatalog, requestKey,
      ...(pairedMachine.credentialGeneration ? { acknowledgedCredentialGeneration: pairedMachine.credentialGeneration } : {}),
    }, pairedMachine.token);
    const latest = await store.read();
    if (!latest.machine) throw new Error("not_paired");
    const providerCatalogHash = localPayloadHash(providerCatalog);
    const machine = response.credentialRotation
      ? { ...latest.machine, token: response.credentialRotation.token, credentialGeneration: response.credentialRotation.generation, expiresAt: response.credentialRotation.expiresAt, providerCatalogHash }
      : { ...latest.machine, credentialGeneration: response.credentialGeneration ?? latest.machine.credentialGeneration ?? 1, expiresAt: response.credentialExpiresAt ?? latest.machine.expiresAt, providerCatalogHash };
    await store.write({ ...latest, machine, pendingHeartbeat: undefined });
    return response;
  }

  private async localCatalog(store: PrivateRegistryStore): Promise<LocalCatalog> {
    const registry = await store.read();
    const checkedAt = Date.parse(registry.providerCatalogCheckedAt ?? "");
    if (registry.providerCatalog && Number.isFinite(checkedAt) && Date.now() - checkedAt < 60_000) return { providers: registry.providerCatalog, loops: registry.loopCatalog ?? [] };
    const catalog = await this.discoverCatalog({ runtimeRoot: join(dirname(defaultJournalPath()), "runtime") }).catch(withoutIncompatibleRuntime);
    const latest = await store.read();
    await store.write({ ...latest, providerCatalog: catalog.providers, loopCatalog: catalog.loops, providerCatalogCheckedAt: new Date().toISOString() });
    return catalog;
  }

  async status(input: { store?: PrivateRegistryStore; runId?: string; details?: boolean; journal?: LocalCommandJournal } = {}) {
    const store = input.store ?? new PrivateRegistryStore(defaultRegistryPath());
    const registry = await store.read();
    if (!registry.machine) throw new Error("not_paired");
    const heartbeat = await this.heartbeat(store);
    if (!input.runId) return { paired: true, machineId: registry.machine.machineId, expiresAt: heartbeat.credentialExpiresAt, checkouts: registry.entries.length, heartbeat: { credentialGeneration: heartbeat.credentialGeneration } };
    const journal = input.journal ?? new LocalCommandJournal(defaultJournalPath());
    const run = await journal.forRun(input.runId).catch(() => { throw new Error("run_unavailable"); });
    const command = await journal.recover(run.commandId);
    const entry = registry.entries.find((candidate) => candidate.handle === command.command.target.checkoutHandle);
    const localPath = entry ? await new LocalCheckoutRegistry(store, (process.env.FLOW_LOCAL_ALLOWED_ROOTS ?? "").split(process.platform === "win32" ? ";" : ":").filter(Boolean)).rootFor(entry.handle, entry.key) : null;
    if (localPath && command.command.kind === "start") {
      const actionKind = String(command.command.payload.snapshot.kind ?? "");
      await inspectLocalReadiness(localPath, actionKind);
    }
    return { paired: true, machineId: registry.machine.machineId, run: { id: input.runId, state: run.state, kind: run.kind, localPath, ...(input.details ? { events: run.events.slice(-50) } : {}) } };
  }

  async unpair(store = new PrivateRegistryStore(defaultRegistryPath())) {
    const registry = await store.read();
    const pending = registry.pendingRevocation ?? (registry.machine ? { server: registry.machine.server, machineId: registry.machine.machineId, token: registry.machine.token, requestKey: randomUUID() } : null);
    if (!pending) return { paired: false, remoteRevocation: "complete" as const };
    await store.write({ ...registry, machine: undefined, pendingPairing: undefined, pendingHeartbeat: undefined, pendingRevocation: pending });
    try {
      await this.request(pending.server, "/api/local-connector/unpair", { protocolVersion: 1, requestKey: pending.requestKey }, pending.token);
      const latest = await store.read();
      await store.write({ ...latest, machine: undefined, pendingPairing: undefined, pendingHeartbeat: undefined, pendingRevocation: undefined });
      return { paired: false, remoteRevocation: "complete" as const };
    } catch (error) {
      if (error instanceof Error && error.message === "machine_revoked") {
        const latest = await store.read();
        await store.write({ ...latest, pendingHeartbeat: undefined, pendingRevocation: undefined });
        return { paired: false, remoteRevocation: "complete" as const };
      }
      if (error instanceof Error && error.message === "connector_unavailable") return { paired: false, remoteRevocation: "pending" as const, reason: "connector_unavailable" as const };
      throw error;
    }
  }

  async run(options: { store?: PrivateRegistryStore; journal?: LocalCommandJournal; handle: (command: unknown, journal: LocalCommandJournal) => Promise<LocalEvent[]>; afterPoll?: (journal: LocalCommandJournal) => Promise<LocalEvent[]>; betweenPolls?: () => Promise<void>; idlePollMs?: number; signal?: AbortSignal; sleep?: (ms: number) => Promise<void>; now?: () => number }) {
    const store = options.store ?? new PrivateRegistryStore(defaultRegistryPath());
    const journal = options.journal ?? new LocalCommandJournal(defaultJournalPath());
    const sleep = options.sleep ?? delay;
    const now = options.now ?? Date.now;
    let nextHeartbeat = 0;
    let backoffMs = 1_000;
    while (!options.signal?.aborted) {
      try {
        if (now() >= nextHeartbeat) {
          await this.heartbeat(store);
          nextHeartbeat = now() + 10_000;
        }
        const registry = await store.read();
        if (!registry.machine) throw new Error("not_paired");
        const response = await this.request<{ protocolVersion: number; commands: unknown[] }>(registry.machine.server, "/api/local-connector/poll", { protocolVersion: 1, limit: 10 }, registry.machine.token);
        if (response.protocolVersion !== 1) throw new Error("protocol_incompatible");
        for (const command of response.commands) {
          let submittedEvents: LocalEvent[] | undefined;
          const dispatch = await journal.dispatch(command, async (acceptedCommand) => {
            submittedEvents = await options.handle(acceptedCommand, journal);
            const runtimeId = submittedEvents.find((event) => event.kind === "accepted")?.payload.runtimeExecutionId;
            return runtimeId ?? acceptedCommand.commandId;
          });
          if (dispatch.state === "unknown") {
            const recovered = await journal.recover(validateLocalCommand(command).commandId);
            const lastSequence = Math.max(0, ...recovered.events.map((event) => event.sequence));
            const payload = { outcome: "unknown" as const, reason: "outcome_unknown", checkoutDigest: null, artifactsSafe: false, runtimeSucceeded: false };
            const event: LocalEvent = { protocolVersion: 1, commandId: recovered.command.commandId, runId: recovered.command.runId, fence: recovered.command.fence, sequence: lastSequence + 1, kind: "terminal", payload, payloadHash: localPayloadHash(payload) };
            await this.sendEvents([event], journal, registry.machine);
            continue;
          }
          const commandRunId = typeof command === "object" && command !== null && "runId" in command && typeof command.runId === "string" ? command.runId : "";
          const events = submittedEvents ?? (await journal.forRun(commandRunId)).events;
          await this.sendEvents(events, journal, registry.machine);
        }
        if (options.afterPoll) await this.sendEvents(await options.afterPoll(journal), journal, registry.machine);
        if (options.betweenPolls) await options.betweenPolls();
        backoffMs = 1_000;
        if (response.commands.length === 0) await sleep(options.idlePollMs ?? DEFAULT_IDLE_POLL_MS);
      } catch (error) {
        if (error instanceof Error && ["not_paired", "machine_revoked", "protocol_incompatible"].includes(error.message)) throw error;
        await sleep(backoffMs);
        backoffMs = Math.min(backoffMs * 2, 60_000);
      }
    }
  }

  private async sendEvents(events: LocalEvent[], journal: LocalCommandJournal, machine: NonNullable<Awaited<ReturnType<PrivateRegistryStore["read"]>>["machine"]>) {
    for (const event of events) {
      await journal.recordEvent(event);
      await this.request(machine.server, "/api/local-connector/events", { protocolVersion: 1, events: [event] }, machine.token);
      await journal.acknowledgeEvent(event.commandId, event.sequence);
    }
  }

  private async request<T>(server: string, route: string, body: unknown, token?: string): Promise<T> {
    let response: Response;
    try { response = await this.fetcher(new URL(route, requireTrustedOrigin(server)), { method: "POST", headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body), redirect: "error" }); }
    catch { throw new Error("connector_unavailable"); }
    const payload = await response.json().catch(() => null) as { error?: { reason?: string } } | T | null;
    const errorPayload = payload && typeof payload === "object" && "error" in payload ? payload.error : undefined;
    if (!response.ok || !payload) {
      const reason = errorPayload?.reason ?? "connector_unavailable";
      throw new Error(reason === "machine_unauthorized" ? "machine_revoked" : reason);
    }
    return payload as T;
  }
}

const INCOMPATIBLE_RUNTIME_REASON = "runtime_incompatible";
const DEFAULT_IDLE_POLL_MS = 10_000;
const LINK_REQUEST_IDLE_POLL_MS = 2_000;
const LOOPBACK_HOSTS = ["localhost", "127.0.0.1", "[::1]"];
function requireTrustedOrigin(value: string) {
  const url = new URL(value);
  const trustedTransport = url.protocol === "https:" || (url.protocol === "http:" && LOOPBACK_HOSTS.includes(url.hostname));
  if (!trustedTransport || url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw new Error("invalid_server");
  return url.origin;
}
function configuredAllowedRoots() { return (process.env.FLOW_LOCAL_ALLOWED_ROOTS ?? "").split(process.platform === "win32" ? ";" : ":").filter(Boolean); }
function allowedRootsForChosenFolder(folder: string) {
  const configured = configuredAllowedRoots();
  return configured.length === 0 ? [folder] : configured;
}
function folderLabel(path: string) { return path.split(/[\\/]/).filter(Boolean).at(-1) ?? "Project checkout"; }
function withoutIncompatibleRuntime(error: unknown): LocalCatalog {
  if (!(error instanceof Error) || error.message !== INCOMPATIBLE_RUNTIME_REASON) throw error;
  stdout.write("Conector local: o compozy instalado não é a versão exigida; seguindo online sem modelos locais.\n");
  return { providers: [], loops: [] };
}
function randomToken() { return randomBytes(48).toString("base64url"); }
function delay(ms: number) { return new Promise<void>((resolve) => setTimeout(resolve, ms)); }
function defaultRegistryPath() { return process.env.FLOW_LOCAL_REGISTRY ?? `${process.env.HOME ?? "."}/.flow-dev/local-registry.json`; }
function defaultJournalPath() { return process.env.FLOW_LOCAL_JOURNAL ?? `${process.env.HOME ?? "."}/.flow-dev/local-journal.json`; }

async function main(args: string[]) {
  const cli = new LocalConnectorClient();
  const [command, ...values] = args;
  if (command === "pair") {
    const flags = parseFlags(values);
    if (!flags.server) throw new Error("usage: pair --server <https-server> [--label <label>]");
    const paired = await cli.pair(flags.server, flags.label);
    stdout.write(`${JSON.stringify(paired)}\n`);
    return;
  }
  if (command === "link") {
    const flags = parseFlags(values);
    const projectId = flags.project;
    const revision = flags["expected-revision"];
    if (!projectId || revision === undefined || !/^\d+$/.test(revision)) throw new Error("usage: link --project <uuid> [--path <root>] --expected-revision <n>");
    const chosenFolder = flags.path ? null : await pickLocalFolder();
    const path = flags.path ?? chosenFolder!;
    const allowedRoots = chosenFolder ? allowedRootsForChosenFolder(chosenFolder) : configuredAllowedRoots();
    const result = await cli.link({ projectId, path, label: flags.label ?? path.split(/[\\/]/).filter(Boolean).at(-1) ?? "Project checkout", expectedRevision: Number(revision), allowedRoots });
    stdout.write(`${JSON.stringify(result)}\n`);
    return;
  }
  if (command === "status") { const flags = parseFlags(values); stdout.write(`${JSON.stringify(await cli.status({ runId: flags.run, details: flags.details === "true" }))}\n`); return; }
  if (command === "unpair") { stdout.write(`${JSON.stringify(await cli.unpair())}\n`); return; }
  if (command === "dev") {
    const server = parseFlags(values).server;
    if (!server) throw new Error("usage: dev --server <server>");
    const store = new PrivateRegistryStore(defaultRegistryPath());
    let confirmationOpened = false;
    const announce = (url: string, code: string) => {
      stdout.write(`\nConector local: este computador ainda não está pareado.\nCódigo de confirmação: ${code}\nConfirme no navegador: ${url}\n\n`);
      if (!confirmationOpened) confirmationOpened = openInBrowser(url);
    };
    await ensurePaired({ isPaired: async () => Boolean((await store.read()).machine), pair: () => cli.pair(server, undefined, announce) });
    stdout.write("Conector local: pareado e rodando.\n");
    await runConnector(cli);
    return;
  }
  if (command === "run") {
    await runConnector(cli);
    return;
  }
  throw new Error("usage: local-connector <pair|link|run|dev|status|unpair>");
}

async function runConnector(cli: LocalConnectorClient) {
  const abort = new AbortController();
  process.once("SIGINT", () => abort.abort());
  const journal = new LocalCommandJournal(defaultJournalPath());
  const store = new PrivateRegistryStore(defaultRegistryPath());
  const agent = new LocalNativeCommandAgent({ store, runtimeRoot: join(dirname(defaultJournalPath()), "runtime") });
  const linkRequests = new LocalLinkRequestWorker({
    claim: () => cli.claimLinkRequest(store),
    pick: () => pickLocalFolder(),
    link: (target) => cli.link({ ...target, label: folderLabel(target.path), allowedRoots: allowedRootsForChosenFolder(target.path), store }),
    settle: (settlement) => cli.settleLinkRequest(settlement, store),
  });
  await cli.run({ signal: abort.signal, store, journal, handle: (input, currentJournal) => agent.handle(input, currentJournal), afterPoll: (currentJournal) => agent.afterPoll(currentJournal), betweenPolls: () => linkRequests.tick(), idlePollMs: LINK_REQUEST_IDLE_POLL_MS });
}

function parseFlags(args: string[]) {
  const result: Record<string, string> = {};
  for (let index = 0; index < args.length; index += 1) {
    const item = args[index]!;
    if (!item.startsWith("--")) throw new Error("invalid_input");
    const key = item.slice(2);
    const value = args[index + 1];
    if (!value || value.startsWith("--")) { result[key] = "true"; continue; }
    result[key] = value;
    index += 1;
  }
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  void main(process.argv.slice(2)).catch((error: unknown) => { stdout.write(`${error instanceof Error ? error.message : "connector_unavailable"}\n`); process.exitCode = 1; });
}
