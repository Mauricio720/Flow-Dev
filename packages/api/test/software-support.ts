import { SoftwareService } from "../src/application/services/software/softwareService";
import type { ListLoopRunsInput, CompozyControlGateway, CreateWorktreeInput, LoopDefinition, LoopRunStatus, ProviderModel, StartLoopInput, WorktreeInfo } from "../src/application/software/compozyControlGateway";
import { controlFailure, controlOk, type ControlErrorCode, type ControlResult } from "../src/application/software/controlErrors";
import type { CredentialBroker, LoginStatus } from "../src/application/software/credentialBroker";
import type { HostChecks } from "../src/application/software/hostChecks";
import { SoftwareController } from "../src/controllers/softwareController";
import { DrizzleSoftwareDao } from "../src/infra/database/dao/software/drizzleSoftwareDao";
import { createSoftwareRouter } from "../src/routers/software";
import { fixture } from "./fixture";

export const READY_HOST: HostChecks = { workspaceRootWritable: true, runtimeImagePinned: true, isolationEnforceable: true, credentialRootPrivate: true };
export const LIVE_MODEL: ProviderModel = { providerId: "codex", modelId: "gpt-5.6-sol", displayName: "gpt-5.6-sol", selectable: true, unselectableReason: null, reasoningChoices: [null, "low", "high"] };
const IDENTITY = { label: "m***@example.com", fingerprint: "f".repeat(64) };

export class FakeBroker implements CredentialBroker {
  lostOperations = new Set<string>();
  hasOperation(operationId: string) { return !this.lostOperations.has(operationId); }
  statuses = new Map<string, LoginStatus>();
  revision = 0;
  disconnected: string[] = [];
  completedLogins: string[] = [];
  rolledBackLogins: string[] = [];
  completedDisconnects: string[] = [];
  rolledBackDisconnects: string[] = [];
  begun: string[] = [];
  async beginCodexLogin(input: { connectionId: string; operationId: string }) {
    this.begun.push(input.operationId);
    return { operationId: input.operationId, verificationUrl: "https://auth.example/device", userCode: "ABCD-1234", expiresAt: new Date(Date.now() + 600_000) };
  }
  setupRequired = false;
  async beginClaudeLogin(input: { connectionId: string; operationId: string }) {
    if (this.setupRequired) throw new Error("setup_required");
    return this.beginCodexLogin(input);
  }
  async pollLogin(operationId: string): Promise<LoginStatus> {
    return this.statuses.get(operationId) ?? { state: "pending", operationId };
  }
  async confirmLogin(operationId: string): Promise<LoginStatus> {
    const current = await this.pollLogin(operationId);
    if (current.state !== "awaiting_confirmation") return current;
    this.revision += 1;
    const confirmed: LoginStatus = { state: "confirmed", operationId, identity: current.identity, credentialRevision: this.revision };
    this.statuses.set(operationId, confirmed);
    return confirmed;
  }
  async completeLogin(operationId: string) { this.completedLogins.push(operationId); }
  async rollbackLogin(operationId: string) { this.rolledBackLogins.push(operationId); }
  authenticate(operationId: string, fingerprint = IDENTITY.fingerprint) {
    this.statuses.set(operationId, { state: "awaiting_confirmation", operationId, identity: { ...IDENTITY, fingerprint }, credentialRevision: this.revision });
  }
  async disconnect(connectionId: string) { this.disconnected.push(connectionId); }
  async completeDisconnect(connectionId: string) { this.completedDisconnects.push(connectionId); }
  async rollbackDisconnect(connectionId: string) { this.rolledBackDisconnects.push(connectionId); }
  activeHome(connectionId: string) { return `/tmp/private/${connectionId}`; }
  async grantForAttempt() { return { attemptId: "a", connectionId: "c", mountPath: "/tmp/x" }; }
  async releaseGrant() {}
}

export class FakeGateway implements CompozyControlGateway {
  runtimeFailure: ControlErrorCode | null = null;
  revokeFailure: ControlErrorCode | null = null;
  authenticated = true;
  overlays = new Map<string, { providerKind: "codex" | "claude"; label: string; homePath: string }>();
  models: ProviderModel[] = [LIVE_MODEL];
  workspaces: Record<string, string> = {};
  worktrees: WorktreeInfo[] = [];
  loops: LoopDefinition[] = [];
  createdWorktrees: string[] = [];
  loopStarts: StartLoopInput[] = [];
  loopStartResult: ControlResult<LoopRunStatus> = controlOk({ runId: "loop-run-1", state: "running", terminalReason: null, definitionVersion: 3, createdAt: "2999-01-01T00:00:00.000Z", inputs: {} }, "v0.3.0-beta.29");
  loopRun: LoopRunStatus = { runId: "loop-run-1", state: "running", terminalReason: null, definitionVersion: 3, createdAt: "2999-01-01T00:00:00.000Z", inputs: {} };
  liveLoopRuns: LoopRunStatus[] = [];
  async listLoopRuns(_input: ListLoopRunsInput) { return controlOk(this.liveLoopRuns, "v0.3.0-beta.29"); }
  async findWorkspace(rootDir: string) { return controlOk(this.workspaces[rootDir] ?? "ws-1", "v0.3.0-beta.29"); }
  async listWorktrees() { return controlOk(this.worktrees, "v0.3.0-beta.29"); }
  async getWorktree(_workspaceId: string, worktreeId: string) {
    const found = this.worktrees.find((item) => item.id === worktreeId);
    return found ? controlOk(found, "v0.3.0-beta.29") : controlFailure("worktree_not_ready", "v0.3.0-beta.29");
  }
  async createWorktree(input: CreateWorktreeInput) {
    this.createdWorktrees.push(input.name);
    const created: WorktreeInfo = { id: `wt-${input.name}`, name: input.name, state: "ready", workspaceId: "ws-1", path: `/wt/${input.name}`, dirty: false, branch: input.name };
    return controlOk(created, "v0.3.0-beta.29");
  }
  async listLoops() { return controlOk(this.loops, "v0.3.0-beta.29"); }
  async inspectLoop(_workspaceId: string, name: string) {
    const found = this.loops.find((item) => item.name === name);
    return found ? controlOk(found, "v0.3.0-beta.29") : controlFailure("loop_version_changed", "v0.3.0-beta.29");
  }
  async startLoop(input: StartLoopInput) { this.loopStarts.push(input); return this.loopStartResult; }
  async getLoopRun() { return controlOk(this.loopRun, "v0.3.0-beta.29"); }
  async cancelLoopRun() { this.loopRun = { ...this.loopRun, state: "canceled", terminalReason: "canceled_by_author" }; return controlOk(this.loopRun, "v0.3.0-beta.29"); }
  async checkRuntime() { return this.runtimeFailure ? controlFailure(this.runtimeFailure) : controlOk({ release: "v0.3.0-beta.29" }, "v0.3.0-beta.29"); }
  async probeProvider(providerId: string) { return controlOk({ providerId, authenticated: this.authenticated }, "v0.3.0-beta.29"); }
  async provisionProviderOverlay(input: { providerId: string; providerKind: "codex" | "claude"; label: string; homePath: string }) {
    this.overlays.set(input.providerId, input);
    return controlOk(undefined, "v0.3.0-beta.29");
  }
  async revokeProviderOverlay(providerId: string) {
    if (this.revokeFailure) return controlFailure(this.revokeFailure, "v0.3.0-beta.29");
    this.overlays.delete(providerId);
    return controlOk(undefined, "v0.3.0-beta.29");
  }
  async listModels(providerId: string) { return controlOk(this.models.map((model) => ({ ...model, providerId })), "v0.3.0-beta.29"); }
  async validateChoice(_providerId: string, choice: { modelId: string; reasoningEffort: string | null }) {
    const model = this.models.find((item) => item.modelId === choice.modelId);
    if (!model) return controlFailure("model_unavailable", "v0.3.0-beta.29");
    if (!model.selectable) return controlFailure(model.unselectableReason ?? "model_unavailable", "v0.3.0-beta.29");
    if (!model.reasoningChoices.includes(choice.reasoningEffort)) return controlFailure("reasoning_effort_unsupported", "v0.3.0-beta.29");
    return controlOk(model, "v0.3.0-beta.29");
  }
}

export async function softwareFixture() {
  const base = await fixture();
  const broker = new FakeBroker();
  const gateway = new FakeGateway();
  const host = { checks: READY_HOST as HostChecks, collect: async () => host.checks };
  const dao = new DrizzleSoftwareDao(base.database);
  const service = new SoftwareService({ dao, broker, gateway, host });
  const router = createSoftwareRouter(new SoftwareController(service));
  const as = (userId: string) => router.createCaller({ principal: { userId }, requestId: "software" }).compozy;
  const anonymous = router.createCaller({ principal: null, requestId: "software" }).compozy;
  return { ...base, broker, gateway, host, dao, service, as, anonymous, adminCaller: as(base.admin.id), memberCaller: as(base.member.id) };
}

export type SoftwareFixture = Awaited<ReturnType<typeof softwareFixture>>;
export const key = () => crypto.randomUUID();
export const failureOf = (promise: Promise<unknown>) => promise.then(() => null, (error: { code?: string; cause?: { reason?: string } }) => ({ code: error.code, reason: error.cause?.reason }));
