import type {
  CompozyControlGateway,
  CreateWorktreeInput,
  ListLoopRunsInput,
  LoopRunRef,
  ModelChoiceCheck,
  ProviderModel,
  ProviderProbe,
  ProviderOverlayInput,
  RuntimeIdentity,
  StartLoopInput,
} from "../../../application/software/compozyControlGateway";
import { COMPOZY_PIN } from "../../../application/spec/specPins";
import { controlFailure, controlOk, type ControlResult } from "../../../application/software/controlErrors";
import { modelListSchema, providerOverlaySchema, providerProbeSchema } from "./compozyControlSchemas";
import { workspaceSchema, workspacesSchema } from "./compozySchemas";
import { CompozyLoops } from "./compozyLoops";
import { CompozyWorktrees } from "./compozyWorktrees";
import { ControlCaller, type ControlCallerConfig } from "./controlCaller";
import { projectModel, reasoningSupported } from "./modelProjection";
import { overlaySettings } from "./providerOverlayCommands";

export type ControlGatewayConfig = ControlCallerConfig;

const AUTHENTICATED_STATE = "authenticated";
const UNPROCESSABLE_STATUS = 422;
const PROBE_STATUS_OVERRIDES = { [UNPROCESSABLE_STATUS]: "runtime_incompatible" } as const;

export class PinnedCompozyControlGateway implements CompozyControlGateway {
  private readonly caller: ControlCaller;
  private readonly worktrees: CompozyWorktrees;
  private readonly loops: CompozyLoops;

  constructor(config: ControlGatewayConfig) {
    this.caller = new ControlCaller(config);
    this.worktrees = new CompozyWorktrees(this.caller);
    this.loops = new CompozyLoops(this.caller);
  }

  findWorkspace = (rootDir: string) => this.caller.guarded({ method: "GET", path: "/api/workspaces" }, workspacesSchema, (body) => body.workspaces.find((workspace) => workspace.root_dir === rootDir)?.id ?? null);
  registerWorkspace = async (input: { rootDir: string; name: string }) => {
    const result = await this.caller.guarded({ method: "POST", path: "/api/workspaces", body: { root_dir: input.rootDir, name: input.name } }, workspaceSchema, (body) => body.workspace.id, { 409: "conflict" });
    if (result.ok || result.code !== "conflict") return result;
    const found = await this.findWorkspace(input.rootDir);
    return found.ok && found.value ? controlOk(found.value, found.release) : result;
  };
  listWorktrees = (workspaceId: string) => this.worktrees.list(workspaceId);
  getWorktree = (workspaceId: string, worktreeId: string) => this.worktrees.get(workspaceId, worktreeId);
  createWorktree = (input: CreateWorktreeInput) => this.worktrees.create(input);
  listLoops = (workspaceId: string) => this.loops.list(workspaceId);
  inspectLoop = (workspaceId: string, name: string) => this.loops.inspect(workspaceId, name);
  startLoop = (input: StartLoopInput) => this.loops.start(input);
  getLoopRun = (ref: LoopRunRef) => this.loops.get(ref);
  listLoopRuns = (input: ListLoopRunsInput) => this.loops.listRuns(input);
  cancelLoopRun = (ref: LoopRunRef) => this.loops.cancel(ref);

  async checkRuntime(): Promise<ControlResult<RuntimeIdentity>> {
    const release = await this.caller.verifyRelease();
    return release.ok ? controlOk({ release: release.value }, release.value) : release;
  }

  probeProvider(providerId: string) {
    const path = `/api/providers/${encodeURIComponent(providerId)}/auth/probe`;
    return this.caller.guarded({ method: "POST", path }, providerProbeSchema, (body): ProviderProbe => ({ providerId, authenticated: body.auth_status.state === AUTHENTICATED_STATE }), PROBE_STATUS_OVERRIDES);
  }

  provisionProviderOverlay(input: ProviderOverlayInput) {
    const path = `/api/settings/providers/${encodeURIComponent(input.providerId)}`;
    return this.caller.guarded({ method: "PUT", path, body: { settings: overlaySettings(input) } }, providerOverlaySchema, () => undefined);
  }

  revokeProviderOverlay(providerId: string) {
    const path = `/api/settings/providers/${encodeURIComponent(providerId)}`;
    return this.caller.guarded({ method: "DELETE", path }, providerOverlaySchema, () => undefined).then((result) =>
      !result.ok && result.code === "worktree_not_ready"
        ? { ok: true as const, value: undefined, release: result.release ?? COMPOZY_PIN.release }
        : result,
    );
  }

  listModels(providerId: string) {
    const path = `/api/model-catalog/providers/${encodeURIComponent(providerId)}/models?refresh=true&include_stale=true`;
    return this.caller.guarded({ method: "GET", path }, modelListSchema, (body): ProviderModel[] => body.models.filter((row) => row.provider_id === providerId).map(projectModel));
  }

  async validateChoice(providerId: string, choice: ModelChoiceCheck): Promise<ControlResult<ProviderModel>> {
    const listed = await this.listModels(providerId);
    if (!listed.ok) return listed;
    const model = listed.value.find((candidate) => candidate.modelId === choice.modelId);
    if (!model) return controlFailure("model_unavailable", listed.release);
    if (!model.selectable) return controlFailure(model.unselectableReason ?? "model_unavailable", listed.release);
    if (!reasoningSupported(model, choice.reasoningEffort)) return controlFailure("reasoning_effort_unsupported", listed.release);
    return controlOk(model, listed.release);
  }
}
