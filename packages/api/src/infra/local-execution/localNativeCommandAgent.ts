import { createHash } from "node:crypto";
import { COMPOZY_VERSION_ARGS, compozyCommand, matchesCompozyPin } from "./pinnedCompozy";
import { execFile } from "node:child_process";
import { access, lstat, readFile, realpath, readdir, mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { promisify } from "node:util";
import type { ExecutionRequest, ReconcileResult } from "../../application/services/task-flow/actionExecutor";
import type { ActionSnapshot } from "../../application/services/task-flow/flowContracts";
import { COMPOZY_PIN, MANAGED_AGENT_NAME } from "../../application/spec/specPins";
import { LocalExecutionError } from "../../application/services/local-execution/localExecutionErrors";
import { localPayloadHash } from "../../application/services/local-execution/localHash";
import { validateLocalCommand, type LocalCommand, type LocalEvent } from "../../application/services/local-execution/localProtocol";
import { loadSpecBundle, defaultBundleDirectory } from "../spec/specBundleLoader";
import { CompozyRuntimeGateway } from "../spec/compozy/compozyRuntimeGateway";
import { boundedRuntimeTransport } from "./boundedRuntimeTransport";
import { questionChanges } from "./localQuestionReporter";
import type { QuestionState } from "../../application/services/local-execution/localQuestions";
import { SnapshotRunExecutor } from "../spec/compozy/snapshotRunExecutor";
import { LocalCommandJournal } from "./localCommandJournal";
import { LocalCheckoutRegistry } from "./localCheckoutRegistry";
import { NativeCompozyRunLauncher } from "./nativeCompozyRunLauncher";
import { PrivateRegistryStore } from "./privateRegistry";
import { resolveGateManifest, type GateManifest } from "../../application/services/local-execution/gatePolicy";
import { GateRunner } from "../../application/services/local-execution/gateRunner";
import { settleGates } from "../../application/services/local-execution/gateSettlement";
import { acquireLocalCheckoutRunLock, releaseLocalCheckoutRunLock } from "./localCheckoutRunLock";
import { isCompozyRuntimeState } from "./compozyRuntimeState";
import { assertNoArtifactConflict } from "./localRunArtifacts";
import { cleanRunDocuments } from "./localRunCleanup";
import { collectLocalArtifacts } from "./localArtifactCollector";
import { withNativeProviderIds } from "./nativeProviderIds";
import { trackableRuntime } from "./trackableRuntime";
import { splitArtifact } from "../../application/services/local-execution/localArtifacts";
import { failureDetailOf, sanitizeFailureDetail } from "../../application/services/local-execution/localFailureDetail";
import { LocalLoopRunExecutor, type LocalRunExecutor } from "./localLoopRunExecutor";
import { installApprovedSpecFiles, installLoopTaskFiles } from "./localLoopTaskFiles";
import { takeRuntimeActivity } from "./localActivityUpdate";
import { runtimeActivityPayload } from "./localActivityPayload";

const exec = promisify(execFile);
const LOOP_KIND = "loop";
const LOCAL_ACTION_KINDS = new Set(["create_spec", "create_tasks", LOOP_KIND]);
type StartCommand = Extract<LocalCommand, { kind: "start" }>;
type CheckoutState = { digest: string; dirty: boolean; files: Map<string, string> };
type ActiveRun = { request: ExecutionRequest; executor: LocalRunExecutor; root: string; command: LocalCommand; sequence: number; initialState: CheckoutState; manifest: GateManifest };

/** Handles the outbound protocol using only the private local registry and native checkout. */
export class LocalNativeCommandAgent {
  private readonly launcher: NativeCompozyRunLauncher;
  private readonly active = new Map<string, ActiveRun>();
  private readonly questions = new Map<string, Map<string, QuestionState>>();
  private recovered = false;

  constructor(private readonly options: { store: PrivateRegistryStore; runtimeRoot: string; environment?: NodeJS.ProcessEnv; verifyCompozyBinary?: (path: string) => Promise<boolean> }) {
    this.launcher = new NativeCompozyRunLauncher({ registry: options.store, runtimeRoot: options.runtimeRoot, executable: compozyCommand(options.environment ?? process.env), environment: options.environment });
  }

  async handle(input: unknown, journal: LocalCommandJournal): Promise<LocalEvent[]> {
    const command = validateLocalCommand(input);
    try {
      if (command.kind === "prepare") return [await this.prepare(command)];
      if (command.kind === "start") return await this.start(command, journal);
      if (command.kind === "cancel") return await this.cancel(command, journal);
      if (command.kind === "inspect") return await this.inspect(command, journal);
      if (command.kind === "answer") return await this.answer(command, journal);
    } catch (error) {
      const reason = error instanceof LocalExecutionError ? error.reason : "runtime_failed";
      if (command.kind === "start" && reason !== "outcome_unknown") await releaseLocalCheckoutRunLock(this.options.runtimeRoot, command.target.checkoutHandle, command.runId);
      const checkoutDigest = command.kind === "prepare" || command.kind === "start" ? await this.rootFor(command).then(checkoutState).then((state) => state.digest).catch(() => null) : null;
      const outcome = reason === "outcome_unknown" ? "unknown" : reason === "runtime_failed" ? "failed" : "blocked";
      const detail = await this.detailFor(command, failureDetailOf(error));
      return [makeEvent(command, 1, "terminal", { outcome, reason, checkoutDigest, artifactsSafe: false, runtimeSucceeded: false, ...(detail ? { detail } : {}) })];
    }
    return [];
  }

  async afterPoll(journal: LocalCommandJournal): Promise<LocalEvent[]> {
    if (!this.recovered) {
      this.recovered = true;
      for (const entry of await journal.activeCommands()) {
        if (entry.command.kind === "start") await this.recoverRun(entry.command.runId, journal);
      }
    }
    const events: LocalEvent[] = [];
    for (const [runId, active] of this.active) {
      const result: ReconcileResult = await active.executor.reconcile(active.request).catch(() => ({ state: "unknown", code: "outcome_unknown" }));
      const activity = takeRuntimeActivity(active.request.run, result);
      if (activity) {
        const payload = runtimeActivityPayload({ activity, root: active.root, environment: this.options.environment ?? process.env });
        if (payload) events.push(makeEvent(active.command, active.sequence++, "activity", payload));
      }
      for (const report of await this.questionReports(runId, active)) events.push(makeEvent(active.command, active.sequence++, "question", report));
      if (result.state === "running" || result.state === "unknown") continue;
      const finalState = await checkoutState(active.root).catch(() => null);
      const artifactsSafe = finalState ? await safeArtifacts(active.root, active.request.snapshot.kind, active.root, active.initialState) : false;
      let outcome: "succeeded" | "failed" | "blocked" | "canceled" | "unknown" = result.state === "succeeded" && artifactsSafe ? "succeeded" : result.state === "canceled" ? "canceled" : result.state === "failed" ? "failed" : result.state === "blocked" ? "blocked" : "failed";
      let reason: string | null = result.code ?? (artifactsSafe ? null : "artifact_unsafe");
      if (outcome === "succeeded" && finalState) {
        const gateResults = [];
        const runner = new GateRunner({
          serviceAvailable: async (url) => { try { const response = await fetch(url, { signal: AbortSignal.timeout(2_000) }); return response.ok; } catch { return false; } },
          environmentAvailable: (name) => Boolean(this.options.environment?.[name] ?? process.env[name]),
          browserAvailable: async () => await runLimited(resolve(active.root, "node_modules/.bin/playwright"), ["--version"], { PATH: this.options.environment?.PATH }).then(() => true, () => false),
          execute: async (input) => executeGate(active.root, input),
        });
        for (const gate of active.manifest.requiredGates) {
          const gateResult = await runner.run({ manifest: active.manifest, gateId: gate.id, attempt: 1, checkoutDigest: finalState.digest });
          gateResults.push({ runId, gateId: gateResult.gateId, attempt: gateResult.attempt, manifestHash: gateResult.manifestHash, state: gateResult.state, reason: gateResult.reason, checkedCheckoutDigest: gateResult.checkedCheckoutDigest });
          events.push(makeEvent(active.command, active.sequence++, "gate", { gateId: gateResult.gateId, attempt: gateResult.attempt, manifestHash: gateResult.manifestHash, commandDigest: gate.commandDigest, checkedCheckoutDigest: gateResult.checkedCheckoutDigest || finalState.digest, state: gateResult.state, reason: gateResult.reason, evidenceHash: null, exitCode: gateResult.exitCode, executionId: gateResult.executionId || `gate-${gate.id}-${gateResult.attempt}`, startedAt: gateResult.startedAt || new Date().toISOString(), finishedAt: gateResult.finishedAt }));
        }
        if (gateResults.some((gate) => gate.state === "unknown")) {
          events.push(makeEvent(active.command, active.sequence++, "terminal", { outcome: "unknown", reason: "outcome_unknown", checkoutDigest: finalState.digest, artifactsSafe, runtimeSucceeded: true }));
          this.active.delete(runId);
          continue;
        }
        const afterGates = await checkoutState(active.root).catch(() => null);
        const settled = afterGates && afterGates.digest === finalState.digest
          ? settleGates({ runId, manifest: active.manifest, results: gateResults, runtimeSucceeded: true, artifactsSafe: true, finalCheckoutDigest: afterGates.digest })
          : { state: "blocked" as const, reason: "preparation_changed" };
        if (settled.state !== "succeeded") { outcome = settled.state === "failed" ? "failed" : "blocked"; reason = settled.reason; }
        else reason = active.manifest.requiredGates.length ? null : "none_required";
      }
      const artifacts = outcome === "succeeded" ? await collectLocalArtifacts(active.root, active.request.snapshot.kind).catch(() => null) : [];
      if (!artifacts) { outcome = "failed"; reason = "artifact_unsafe"; }
      for (const part of (artifacts ?? []).flatMap(splitArtifact)) events.push(makeEvent(active.command, active.sequence++, "artifact", part));
      await cleanRunDocuments({ root: active.root, runtimeRoot: this.options.runtimeRoot, command: active.command, collectedPaths: (artifacts ?? []).map((file) => file.path) });
      const detail = result.activity?.kind === "warning" ? await this.detailFor(active.command, result.activity.preview) : null;
      events.push(makeEvent(active.command, active.sequence++, "terminal", { outcome, reason, checkoutDigest: finalState?.digest ?? null, artifactsSafe: artifactsSafe && artifacts !== null, runtimeSucceeded: result.state === "succeeded", ...(detail ? { detail } : {}) }));
      await releaseLocalCheckoutRunLock(this.options.runtimeRoot, active.command.target.checkoutHandle, runId);
      this.active.delete(runId);
      this.questions.delete(runId);
    }
    return [...await journal.unsentEvents(), ...events];
  }

  private async prepare(command: Extract<LocalCommand, { kind: "prepare" }>): Promise<LocalEvent> {
    const root = await this.rootFor(command);
    const actionKind = typeof command.payload.action.kind === "string" ? command.payload.action.kind : "";
    if (!LOCAL_ACTION_KINDS.has(actionKind)) throw new LocalExecutionError("runtime_incompatible", { cause: "Este tipo de ação ainda não roda no projeto local." });
    const action = command.payload.action;
    const runtimes = action.kind === "loop" ? Object.values((action.runtimeBindings ?? {}) as Record<string, { providerId?: unknown }>) : [action.runtime as { providerId?: unknown }];
    const providerKinds = [...new Set(runtimes.map((runtime) => runtime?.providerId).filter((value): value is string => value === "codex" || value === "claude"))];
    if (!providerKinds.length) throw new LocalExecutionError("runtime_incompatible", { cause: "A ação não indica um provedor suportado pelo conector local (codex ou claude)." });
    const compozyBinary = await resolveExecutable(compozyCommand(this.options.environment ?? process.env), this.options.environment?.PATH ?? process.env.PATH ?? "");
    const binaryMatches = compozyBinary ? await (this.options.verifyCompozyBinary?.(compozyBinary) ?? matchesCompozyPin(compozyBinary)) : false;
    const version = compozyBinary ? await runLimited(compozyBinary, COMPOZY_VERSION_ARGS, { PATH: this.options.environment?.PATH }).catch(() => "") : "";
    if (!binaryMatches || !version.includes(COMPOZY_PIN.version)) throw new LocalExecutionError("runtime_incompatible", { cause: `CompozyOS local incompatível: esperado ${COMPOZY_PIN.version}, encontrado ${version || "nenhum binário verificável"}.` });
    for (const kind of providerKinds) {
      const status = kind === "codex" ? ["login", "status", "-c", "cli_auth_credentials_store=file"] : ["auth", "status"];
      await runLimited(kind, status, { PATH: this.options.environment?.PATH, HOME: homedir(), ...(kind === "codex" ? { CODEX_HOME: resolve(homedir(), ".codex") } : { CLAUDE_CONFIG_DIR: resolve(homedir(), ".claude") }) }).catch((error) => { throw new LocalExecutionError("runtime_incompatible", { cause: `A verificação de login do ${kind} falhou nesta máquina: ${commandFailure(error)}` }); });
    }
    const state = await checkoutState(root);
    const manifest = await resolveLocalGateManifest(root, actionKind);
    await this.saveManifest(command.payload.preparationId, manifest);
    const bundle = await loadSpecBundle(defaultBundleDirectory()).catch(() => { throw new LocalExecutionError("runtime_incompatible", { cause: "O pacote de skills da spec não pôde ser carregado na instalação do conector." }); });
    const capabilities = ["git", `compozy-${COMPOZY_PIN.version}`, `bundle-${bundle.digest.slice(0, 12)}`, ...providerKinds.map((kind) => `provider-${kind}`)];
    const payload = { preparationId: command.payload.preparationId, checkoutLabel: command.payload.checkoutLabel, dirty: state.dirty, checkoutDigest: state.digest, manifestHash: manifest.hash, capabilities, requiredGates: manifest.requiredGates.map(({ id, label, commandDigest, kind }) => ({ id, label, commandDigest, kind })) };
    return makeEvent(command, 1, "prepared", payload);
  }

  private async start(command: Extract<LocalCommand, { kind: "start" }>, journal: LocalCommandJournal): Promise<LocalEvent[]> {
    const root = await this.rootFor(command);
    const prep = await journal.forRun(command.payload.preparationId).catch(() => null);
    const prepared = prep?.events.find((event) => event.kind === "prepared");
    if (!prepared || prepared.kind !== "prepared" || prep?.preparation?.actionId !== command.payload.actionId || prep.preparation.sourceSnapshotId !== command.payload.snapshot.sourceSnapshotId) throw new LocalExecutionError("preparation_changed", { cause: "A preparação desta ação não foi encontrada no conector. Prepare novamente." });
    const current = await checkoutState(root);
    const snapshot = withNativeProviderIds(command.payload.snapshot as unknown as ActionSnapshot);
    const manifest = await resolveLocalGateManifest(root, snapshot.kind);
    const pinnedManifest = await this.loadManifest(command.payload.preparationId);
    if (current.digest !== prepared.payload.checkoutDigest || manifest.hash !== prepared.payload.manifestHash || pinnedManifest.hash !== manifest.hash) throw new LocalExecutionError("preparation_changed", { cause: "O checkout ou as verificações obrigatórias mudaram depois da preparação. Prepare novamente." });
    if (snapshot.workspace.kind !== "local" || snapshot.workspace.target?.machineId !== command.machineId || snapshot.workspace.target.linkId !== command.target.linkId || snapshot.workspace.target.linkRevision !== command.target.linkRevision || snapshot.workspace.target.checkoutHandle !== command.target.checkoutHandle || snapshot.operatorId !== command.actorId || snapshot.localPreparation?.preparationId !== command.payload.preparationId) throw new LocalExecutionError("preparation_changed", { cause: "O vínculo local ou a pessoa operadora mudou depois da preparação. Prepare novamente." });
    if (snapshot.localPreparation?.manifestHash !== manifest.hash || snapshot.localPreparation.requiredGates.length !== manifest.requiredGates.length || manifest.requiredGates.some((gate) => !snapshot.localPreparation?.requiredGates.some((preparedGate) => preparedGate.id === gate.id && preparedGate.commandDigest === gate.commandDigest))) throw new LocalExecutionError("preparation_changed", { cause: "As verificações obrigatórias mudaram depois da preparação. Prepare novamente." });
    await assertNoArtifactConflict(root, snapshot.kind);
    await acquireLocalCheckoutRunLock(this.options.runtimeRoot, command.target.checkoutHandle, command.runId);
    const executor = await this.executorFor(command, root);
    const run = { id: command.runId, actionId: command.payload.actionId, taskId: command.payload.taskId, attemptNumber: 1, state: "running", snapshot: snapshot as unknown as Record<string, unknown>, worktreeId: null, connectionIds: Object.keys(snapshot.runtimeProviderIds), isWrite: true, leaseFence: command.fence, idempotencyKey: command.commandId, terminalCode: null, runtime: { workspaceId: null, sessionId: null, turnId: null, runId: null }, leaseOwner: null, requestedBy: command.actorId, createdAt: new Date(), finishedAt: null };
    const request = { run, snapshot, grants: [] } as ExecutionRequest;
    const baseline = await checkoutState(root);
    const result = await executor.execute(request);
    const runtime = trackableRuntime(result);
    if (!runtime) {
      if (result.kind === "failed" || result.kind === "blocked") await this.abandonStart(command, root);
      const detail = await this.detailFor(command, "detail" in result ? result.detail : null);
      return [makeEvent(command, 1, "terminal", { outcome: result.kind === "blocked" ? "blocked" : result.kind === "failed" ? "failed" : "unknown", reason: "code" in result ? result.code : "outcome_unknown", checkoutDigest: baseline.digest, artifactsSafe: true, runtimeSucceeded: false, ...(detail ? { detail } : {}) })];
    }
    request.run.runtime = { ...request.run.runtime, ...runtime };
    const active: ActiveRun = { request, executor, root, command, sequence: 2, initialState: baseline, manifest };
    this.active.set(command.runId, active);
    return [makeEvent(command, 1, "accepted", { runtimeExecutionId: runtime.sessionId ?? command.runId, runtimeWorkspaceId: runtime.workspaceId ?? command.projectId, runtimeSessionId: runtime.sessionId ?? command.commandId, runtimeTurnId: runtime.turnId ?? null })];
  }

  private async abandonStart(command: Extract<LocalCommand, { kind: "start" }>, root: string) {
    await cleanRunDocuments({ root, runtimeRoot: this.options.runtimeRoot, command });
    await releaseLocalCheckoutRunLock(this.options.runtimeRoot, command.target.checkoutHandle, command.runId);
  }

  private async cancel(command: Extract<LocalCommand, { kind: "cancel" }>, journal: LocalCommandJournal): Promise<LocalEvent[]> {
    const active = this.active.get(command.runId) ?? await this.recoverRun(command.runId, journal);
    if (!active) throw new LocalExecutionError("outcome_unknown");
    const result = await active.executor.cancel?.(active.request);
    if (!result || result.state !== "canceled") throw new LocalExecutionError("outcome_unknown");
    this.active.delete(command.runId);
    await cleanRunDocuments({ root: active.root, runtimeRoot: this.options.runtimeRoot, command: active.command });
    const checkout = await checkoutState(active.root);
    const cancelAccepted = makeEvent(command, 1, "accepted", { runtimeExecutionId: `cancel-${command.runId}`, runtimeWorkspaceId: command.projectId, runtimeSessionId: command.commandId, runtimeTurnId: null });
    const originalTerminal = makeEvent(active.command, active.sequence + 1, "terminal", { outcome: "canceled", reason: "user_canceled", checkoutDigest: checkout.digest, artifactsSafe: true, runtimeSucceeded: false });
    const cancelTerminal = makeEvent(command, 2, "terminal", { outcome: "canceled", reason: "user_canceled", checkoutDigest: checkout.digest, artifactsSafe: true, runtimeSucceeded: false });
    await releaseLocalCheckoutRunLock(this.options.runtimeRoot, active.command.target.checkoutHandle, command.runId);
    return [cancelAccepted, originalTerminal, cancelTerminal];
  }

  private async answer(command: Extract<LocalCommand, { kind: "answer" }>, journal: LocalCommandJournal): Promise<LocalEvent[]> {
    const active = this.active.get(command.runId) ?? await this.recoverRun(command.runId, journal);
    if (!active) throw new LocalExecutionError("outcome_unknown");
    const delivered = await active.executor.answerQuestion(active.request, { interactionId: command.payload.interactionId, answer: command.payload.answer });
    if (!delivered) throw new LocalExecutionError("interaction_unavailable");
    return [makeEvent(command, 1, "accepted", {
      runtimeExecutionId: `answer-${command.payload.interactionId}`,
      runtimeWorkspaceId: active.request.run.runtime.workspaceId ?? command.projectId,
      runtimeSessionId: active.request.run.runtime.sessionId ?? command.commandId,
      runtimeTurnId: active.request.run.runtime.turnId ?? null,
    })];
  }

  private async inspect(command: Extract<LocalCommand, { kind: "inspect" }>, journal: LocalCommandJournal): Promise<LocalEvent[]> {
    const run = await journal.forRun(command.runId);
    const terminal = run.events.filter((event) => event.kind === "terminal").at(-1);
    const state = terminal?.kind === "terminal"
      ? `terminal ${terminal.payload.outcome}`
      : this.active.has(command.runId) ? "running" : run.state;
    const summary = `Local run ${state}`;
    return [makeEvent(command, 1, "activity", { summary, relativeFiles: [] })];
  }

  private async saveManifest(preparationId: string, manifest: GateManifest) {
    const directory = resolve(this.options.runtimeRoot, "gate-manifests");
    await mkdir(directory, { recursive: true, mode: 0o700 });
    await writeFile(resolve(directory, `${preparationId}.json`), JSON.stringify(manifest), { mode: 0o600 });
  }

  private async loadManifest(preparationId: string): Promise<GateManifest> {
    try { return JSON.parse(await readFile(resolve(this.options.runtimeRoot, "gate-manifests", `${preparationId}.json`), "utf8")) as GateManifest; }
    catch { throw new LocalExecutionError("preparation_changed"); }
  }

  private async recoverRun(runId: string, journal: LocalCommandJournal) {
    const current = this.active.get(runId);
    if (current) return current;
    const entry = (await journal.activeCommands()).find((candidate) => candidate.command.runId === runId);
    const accepted = entry?.events.find((event) => event.kind === "accepted");
    if (!entry || entry.command.kind !== "start" || !accepted || accepted.kind !== "accepted") return null;
    const active = await this.makeActive(entry.command, accepted.payload.runtimeWorkspaceId, accepted.payload.runtimeSessionId, accepted.payload.runtimeTurnId, Math.max(0, ...entry.events.map((event) => event.sequence)));
    if (active) this.active.set(runId, active);
    return active;
  }

  private async executorFor(command: StartCommand, root: string): Promise<LocalRunExecutor> {
    if (command.payload.snapshot.kind === LOOP_KIND) return new LocalLoopRunExecutor({ launcher: this.launcher, root, prepare: () => installLoopTaskFiles({ root, taskId: command.payload.taskId, files: command.payload.taskFiles ?? [] }) });
    const bundle = await loadSpecBundle(defaultBundleDirectory());
    const pins = { version: COMPOZY_PIN.version, binarySha256: COMPOZY_PIN.binarySha256, openApiSha256: COMPOZY_PIN.openApiSha256, bundleSha256: bundle.digest };
    return new SnapshotRunExecutor({ gateway: new CompozyRuntimeGateway(boundedRuntimeTransport), launcher: this.launcher, runtime: { agentName: MANAGED_AGENT_NAME, declared: pins, accepted: pins }, taskFor: async () => command.payload.task, beforeSubmit: () => installApprovedSpecFiles({ root, files: command.payload.taskFiles ?? [] }), workspaceRoot: () => root });
  }

  private async questionReports(runId: string, active: ActiveRun) {
    if (active.request.snapshot.kind === LOOP_KIND) return [];
    const known = this.questions.get(runId) ?? new Map<string, QuestionState>();
    this.questions.set(runId, known);
    return questionChanges({ launcher: this.launcher, gateway: new CompozyRuntimeGateway(boundedRuntimeTransport), request: active.request, root: active.root, known });
  }

  private async detailFor(command: LocalCommand, detail: string | null | undefined) {
    if (!detail) return null;
    const checkoutRoot = await this.rootFor(command).catch(() => null);
    const secrets = Object.values(this.options.environment ?? process.env).filter((value): value is string => Boolean(value) && value !== homedir());
    return sanitizeFailureDetail(detail, { checkoutRoot, home: homedir(), secrets });
  }

  private async rootFor(command: LocalCommand) {
    const registry = await this.options.store.read();
    const entry = registry.entries.find((candidate) => candidate.handle === command.target.checkoutHandle);
    if (!entry) throw new LocalExecutionError("path_invalid", { cause: "O checkout vinculado não está registrado nesta máquina. Refaça o vínculo em Projeto local." });
    return new LocalCheckoutRegistry(this.options.store, []).rootFor(entry.handle, entry.key);
  }

  private async makeActive(command: Extract<LocalCommand, { kind: "start" }>, workspaceId: string, sessionId: string, turnId: string | null, sequence: number) {
    try {
      const root = await this.rootFor(command);
      await acquireLocalCheckoutRunLock(this.options.runtimeRoot, command.target.checkoutHandle, command.runId);
      const snapshot = withNativeProviderIds(command.payload.snapshot as unknown as ActionSnapshot);
      const executor = await this.executorFor(command, root);
      const acceptedRun = { id: command.runId, actionId: command.payload.actionId, taskId: command.payload.taskId, attemptNumber: 1, state: "running", snapshot: snapshot as unknown as Record<string, unknown>, worktreeId: null, connectionIds: Object.keys(snapshot.runtimeProviderIds), isWrite: true, leaseFence: command.fence, idempotencyKey: command.commandId, terminalCode: null, runtime: { workspaceId, sessionId, turnId, runId: command.runId }, leaseOwner: null, requestedBy: command.actorId, createdAt: new Date(), finishedAt: null };
      return { request: { run: acceptedRun, snapshot, grants: [] } as ExecutionRequest, executor, root, command, sequence: sequence + 1, initialState: await checkoutState(root), manifest: await this.loadManifest(command.payload.preparationId) } as ActiveRun;
    } catch { return null; }
  }
}

export async function inspectLocalReadiness(root: string, actionKind: string, environment: NodeJS.ProcessEnv = process.env) {
  const manifest = await resolveLocalGateManifest(root, actionKind);
  const compozyBinary = await resolveExecutable(compozyCommand(environment), environment.PATH ?? "");
  const binaryMatches = compozyBinary ? await matchesCompozyPin(compozyBinary) : false;
  const version = compozyBinary ? await runLimited(compozyBinary, COMPOZY_VERSION_ARGS, { PATH: environment.PATH }).catch(() => "") : "";
  if (!binaryMatches || !version.includes(COMPOZY_PIN.version)) throw new LocalExecutionError("runtime_incompatible", { cause: `CompozyOS local incompatível: esperado ${COMPOZY_PIN.version}, encontrado ${version || "nenhum binário verificável"}.` });
  return manifest;
}

export async function checkoutState(root: string): Promise<CheckoutState> {
  const [status, listing] = await Promise.all([
    exec("git", ["-C", root, "status", "--porcelain", "--untracked-files=all"], { maxBuffer: 1024 * 1024 }),
    exec("git", ["-C", root, "ls-files", "--cached", "--others", "--exclude-standard", "-z"], { maxBuffer: 8 * 1024 * 1024 }),
  ]);
  const files = new Map<string, string>();
  for (const path of listing.stdout.split("\0").filter(Boolean).sort()) {
    if (isCompozyRuntimeState(path)) continue;
    if (isAbsolute(path) || path.split(/[\\/]/).some((part) => part === ".." || part === ".git")) throw new LocalExecutionError("path_not_allowed");
    const fullPath = resolve(root, path);
    const canonical = await realpath(fullPath).catch(() => null);
    if (!canonical || !isWithin(root, canonical) || !(await lstat(fullPath)).isFile()) throw new LocalExecutionError("path_not_allowed");
    const bytes = await readFile(canonical);
    files.set(path, digest(bytes));
  }
  const aggregate = [...files].map(([path, hash]) => `${path}\0${hash}`).join("\0");
  return { digest: digest(aggregate), dirty: status.stdout.length > 0, files };
}

async function instructionSources(root: string, scopes: string[]) {
  scopes = [".", ".flow-spec", ...scopes];
  const paths = new Set<string>();
  for (const scope of scopes) {
    const parts = scope === "." ? [] : scope.split(/[\\/]/).filter(Boolean);
    for (let depth = 0; depth <= parts.length; depth += 1) paths.add(resolve(root, ...parts.slice(0, depth), "AGENTS.md"));
  }
  const sources: Array<[string, string]> = [];
  const visited = new Set<string>();
  const referenced = new Set<string>();
  while (paths.size) {
    const path = paths.values().next().value as string;
    paths.delete(path);
    if (visited.has(path)) continue;
    visited.add(path);
    if (visited.size > 128) throw new LocalExecutionError("instructions_invalid");
    const content = await readFile(path, "utf8").catch((error: unknown) => isMissing(error) ? null : Promise.reject(error));
    if (content === null) {
      if (referenced.has(path)) throw new LocalExecutionError("instructions_invalid");
      continue;
    }
    if (Buffer.byteLength(content) > 65_536 || content.includes("\u0000")) throw new LocalExecutionError("instructions_invalid");
    const canonical = await realpath(path).catch(() => null);
    if (!canonical || !isWithin(root, canonical)) throw new LocalExecutionError("instructions_invalid");
    const relativePath = relative(root, canonical).split(sep).join("/");
    sources.push([relativePath, content]);
    for (const reference of instructionReferences(content)) {
      const target = resolve(dirname(canonical), reference);
      if (!isWithin(root, target)) throw new LocalExecutionError("instructions_invalid");
      paths.add(target);
      referenced.add(target);
    }
  }
  if (sources.reduce((total, [, content]) => total + Buffer.byteLength(content), 0) > 2 * 1024 * 1024) throw new LocalExecutionError("instructions_invalid");
  return sources.sort(([left], [right]) => left.localeCompare(right));
}

function instructionReferences(content: string) {
  const references = new Set<string>();
  const candidates = content.matchAll(/(?:\]\(|`)((?:\.\.?\/)*(?:\.agents|\.claude|skills|rules|docs|instructions|AGENTS\.md)[^\s)`]*\.md)(?:#[^\s)`]*)?(?:\)|`)/g);
  for (const match of candidates) references.add(match[1]!);
  return references;
}

export async function resolveLocalGateManifest(root: string, actionKind: string) {
  const configPath = resolve(root, ".flow-spec", "local-gates.json");
  const configText = await readFile(configPath, "utf8").catch((error: unknown) => isMissing(error) ? null : Promise.reject(error));
  const declarations: Array<{ id: string; label: string; argv: string[]; cwd: string; timeoutMs?: number; sourcePath: string; sourceText: string; kind: "command" | "playwright"; serviceUrls?: string[]; environmentKeys?: string[] }> = [];
  if (configText !== null) {
    if (Buffer.byteLength(configText) > 65_536) throw new LocalExecutionError("instructions_invalid");
    let parsed: unknown;
    try { parsed = JSON.parse(configText); } catch { throw new LocalExecutionError("instructions_invalid"); }
    const records = typeof parsed === "object" && parsed !== null && "gates" in parsed ? parsed.gates : parsed;
    if (!Array.isArray(records) || records.length > 64) throw new LocalExecutionError("gate_policy_unresolved");
    for (const record of records) {
      if (!record || typeof record !== "object") throw new LocalExecutionError("gate_policy_unresolved");
      const gate = record as Record<string, unknown>;
      if (typeof gate.id !== "string" || typeof gate.label !== "string" || !Array.isArray(gate.argv) || !gate.argv.every((part) => typeof part === "string") || typeof gate.cwd !== "string" || (gate.kind !== "command" && gate.kind !== "playwright")) throw new LocalExecutionError("gate_policy_unresolved");
      if (isAbsolute(gate.cwd) || gate.cwd.split(/[\\/]/).some((part) => part === "..")) throw new LocalExecutionError("gate_policy_unresolved");
      declarations.push({ id: gate.id, label: gate.label, argv: gate.argv as string[], cwd: gate.cwd, ...(typeof gate.timeoutMs === "number" ? { timeoutMs: gate.timeoutMs } : {}), sourcePath: ".flow-spec/local-gates.json", sourceText: configText, kind: gate.kind, ...(Array.isArray(gate.serviceUrls) ? { serviceUrls: gate.serviceUrls as string[] } : {}), ...(Array.isArray(gate.environmentKeys) ? { environmentKeys: gate.environmentKeys as string[] } : {}) });
    }
  }
  const instructions = await instructionSources(root, declarations.map((gate) => gate.cwd));
  return resolveGateManifest({ actionKind, declarations, sources: instructions.map(([path, text]) => ({ path, text })) });
}

async function executeGate(root: string, input: { argv: string[]; cwd: string; timeoutMs: number; checkoutDigest: string; environmentKeys: string[] }) {
  const startedAt = new Date().toISOString();
  const cwd = resolve(root, input.cwd);
  if (!isWithin(root, cwd) || !(await realpath(cwd).then((path) => isWithin(root, path), () => false))) return { exitCode: null, timedOut: false, executedTests: null, failedTests: null, skippedTests: null, setupReason: "gate_policy_unresolved", executionId: crypto.randomUUID(), checkedCheckoutDigest: input.checkoutDigest, startedAt, finishedAt: new Date().toISOString() };
  const executionId = crypto.randomUUID();
  const env: NodeJS.ProcessEnv = { PATH: process.env.PATH, HOME: homedir() };
  for (const key of input.environmentKeys) if (process.env[key] !== undefined) env[key] = process.env[key];
  try {
    const result = await exec(input.argv[0]!, input.argv.slice(1), { cwd, timeout: input.timeoutMs, maxBuffer: 1024 * 1024, env });
    const output = `${result.stdout}\n${result.stderr}`;
    const counts = playwrightCounts(output);
    return { exitCode: 0, timedOut: false, executedTests: counts.executed, failedTests: counts.failed, skippedTests: counts.skipped, setupReason: null, executionId, checkedCheckoutDigest: input.checkoutDigest, startedAt, finishedAt: new Date().toISOString() };
  } catch (error) {
    const failure = error as NodeJS.ErrnoException & { code?: number | string; killed?: boolean; stdout?: string; stderr?: string };
    const output = `${failure.stdout ?? ""}\n${failure.stderr ?? ""}`;
    const counts = playwrightCounts(output);
    return { exitCode: typeof failure.code === "number" ? failure.code : null, timedOut: failure.killed === true, executedTests: counts.executed, failedTests: counts.failed, skippedTests: counts.skipped, setupReason: failure.code === "ENOENT" ? "dependency_missing" : null, executionId, checkedCheckoutDigest: input.checkoutDigest, startedAt, finishedAt: new Date().toISOString() };
  }
}

async function resolveExecutable(name: string, pathValue: string) {
  const candidates = name.includes(sep) || isAbsolute(name) ? [resolve(name)] : pathValue.split(process.platform === "win32" ? ";" : ":").filter(Boolean).map((directory) => resolve(directory, name));
  for (const candidate of candidates) {
    try { await access(candidate, 1); return await realpath(candidate); } catch { /* try the next PATH entry */ }
  }
  return null;
}

function playwrightCounts(output: string) {
  const passed = output.match(/(\d+)\s+passed/i);
  const failed = output.match(/(\d+)\s+failed/i);
  const skipped = output.match(/(\d+)\s+skipped/i);
  return { executed: passed || failed ? Number(passed?.[1] ?? 0) + Number(failed?.[1] ?? 0) + Number(skipped?.[1] ?? 0) : null, failed: failed ? Number(failed[1]) : null, skipped: skipped ? Number(skipped[1]) : null };
}

async function safeArtifacts(root: string, kind: string, allowedRoot: string, before: CheckoutState) {
  if (kind === LOOP_KIND) return true;
  try {
    const output = resolve(root, ".flow-spec");
    const names = kind === "create_spec" ? ["_spec.md", "_user_stories.md", "_dx.md", "_tests.md"] : ["_tasks.md", ...(await readdir(output)).filter((name) => /^task_\d+\.md$/.test(name))];
    if (kind === "create_tasks" && names.length < 2) return false;
    for (const name of names) {
      const path = resolve(output, name);
      if (!isWithin(allowedRoot, path) || !(await lstat(path)).isFile()) return false;
      const content = await readFile(path, "utf8");
      if (!content.trim() || Buffer.byteLength(content) > 256 * 1024 || /(?:gh[pousr]_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{20,}|-----BEGIN [A-Z ]+PRIVATE KEY-----|https?:\/\/[^\s/@]+:[^\s/@]+@)/i.test(content)) return false;
    }
    const current = await checkoutState(root);
    for (const [path, hash] of current.files) if (before.files.get(path) !== hash && !path.startsWith(".flow-spec/")) return false;
    return true;
  } catch { return false; }
}

function commandFailure(error: unknown) {
  const failure = error as { code?: unknown; stderr?: unknown; message?: unknown };
  if (failure.code === "ENOENT") return "executável não encontrado no PATH.";
  const output = typeof failure.stderr === "string" && failure.stderr.trim() ? failure.stderr : String(failure.message ?? "");
  return output.trim().split("\n")[0] || "o comando terminou com erro.";
}

function makeEvent<K extends LocalEvent["kind"]>(command: LocalCommand, sequence: number, kind: K, payload: Extract<LocalEvent, { kind: K }>["payload"]): Extract<LocalEvent, { kind: K }> {
  return { protocolVersion: 1, commandId: command.commandId, runId: command.runId, fence: command.fence, sequence, payloadHash: localPayloadHash(payload), kind, payload } as Extract<LocalEvent, { kind: K }>;
}

async function runLimited(command: string, args: string[], env?: NodeJS.ProcessEnv) { return (await exec(command, args, { timeout: 10_000, env: { HOME: homedir(), ...env, PATH: env?.PATH ?? process.env.PATH }, maxBuffer: 16_384 })).stdout.trim(); }
function isWithin(root: string, path: string) { const value = relative(root, path); return value === "" || (value !== ".." && !value.startsWith(`..${sep}`) && !isAbsolute(value)); }
function digest(value: string | Buffer) { return createHash("sha256").update(value).digest("hex"); }
function isMissing(error: unknown) { return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT"; }
