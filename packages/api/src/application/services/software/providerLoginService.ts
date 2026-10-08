import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { SessionPrincipal } from "../../../context";
import type { ConnectionRecord, ProviderKind, SoftwareDao } from "../../database/dao/softwareDao";
import type { CredentialBroker } from "../../software/credentialBroker";
import { normalizeLabel } from "./connectionRules";
import { requireAdmin, systemClock, type Clock } from "./softwareAccess";
import { SoftwareError } from "./softwareErrors";

export type BeginLoginRequest = { connectionId?: string; label?: string; idempotencyKey: string };
export type StartedLoginView = { state: "started"; operationId: string; connectionId: string; connectionRevision: number; verificationUrl: string; userCode: string; expiresAt: Date };
export type SetupRequiredView = { state: "setup_required"; operationId: string; connectionId: string; connectionRevision: number };
export type LoginStartView = StartedLoginView | SetupRequiredView;

type StartedLogin = Omit<StartedLoginView, "connectionRevision">;
type SetupRequired = Omit<SetupRequiredView, "connectionRevision">;

const NONCE_BYTES = 16;
const PROVIDER_ID_SUFFIX_LENGTH = 12;
const RECONNECTABLE_STATES = ["unconnected", "failed", "expired", "disconnected"];
const SETUP_REQUIRED = "setup_required";
const LOGIN_LOST = "login_lost";

export class ProviderLoginService {
  constructor(private readonly dao: SoftwareDao, private readonly broker: CredentialBroker, private readonly provider: ProviderKind = "codex", private readonly clock: Clock = systemClock) {}

  async begin(actor: SessionPrincipal, input: BeginLoginRequest): Promise<LoginStartView> {
    await requireAdmin(this.dao, actor);
    if (!input.connectionId === !input.label) throw new SoftwareError("invalid_input");
    return this.dao.transaction((dao) => new ProviderLoginService(dao, this.broker, this.provider, this.clock).beginLocked(actor, input));
  }

  private async beginLocked(actor: SessionPrincipal, input: BeginLoginRequest): Promise<LoginStartView> {
    const replay = await this.dao.operations.findByKey(input.idempotencyKey);
    if (replay) return this.withRevision(await this.start(replay.connectionId, replay.id));
    const connection = await this.resolveConnection(actor, input);
    await this.dao.operations.expireDue(connection.id, this.clock());
    await this.expireLostOperations(connection.id);
    const operation = await this.insertOperation(actor, connection.id, input.idempotencyKey);
    const started = await this.start(connection.id, operation.id);
    if (started.state === SETUP_REQUIRED) return this.markSetupRequired(connection, operation.id);
    await this.dao.operations.update(operation.id, { expiresAt: started.expiresAt });
    if (RECONNECTABLE_STATES.includes(connection.authState)) await this.dao.connections.update(connection.id, { authState: "pending" });
    return this.withRevision(started);
  }

  private async expireLostOperations(connectionId: string) {
    for (const operation of await this.dao.operations.listActive(connectionId)) {
      if (!this.broker.hasOperation(operation.id)) await this.dao.operations.update(operation.id, { state: "expired", failureCode: LOGIN_LOST });
    }
  }

  private async markSetupRequired(connection: ConnectionRecord, operationId: string): Promise<SetupRequiredView> {
    await this.dao.operations.update(operationId, { state: "failed", failureCode: SETUP_REQUIRED });
    const updated = connection.authState === "connected" ? connection : await this.dao.connections.update(connection.id, { authState: SETUP_REQUIRED });
    return { state: SETUP_REQUIRED, operationId, connectionId: connection.id, connectionRevision: updated.revision };
  }

  private async withRevision(started: StartedLogin | SetupRequired): Promise<LoginStartView> {
    const connection = await this.dao.connections.find(started.connectionId);
    return { ...started, connectionRevision: connection!.revision } as LoginStartView;
  }

  private async start(connectionId: string, operationId: string): Promise<StartedLogin | SetupRequired> {
    try {
      const ids = { connectionId, operationId };
      const started = await (this.provider === "codex" ? this.broker.beginCodexLogin(ids) : this.broker.beginClaudeLogin(ids));
      return { state: "started", operationId, connectionId, verificationUrl: started.verificationUrl, userCode: started.userCode, expiresAt: started.expiresAt };
    } catch (error) {
      if (error instanceof Error && error.message === "login_in_progress") throw new SoftwareError("login_in_progress");
      if (error instanceof Error && error.message === SETUP_REQUIRED) return { state: SETUP_REQUIRED, operationId, connectionId };
      throw new SoftwareError("service_unavailable");
    }
  }

  private async resolveConnection(actor: SessionPrincipal, input: BeginLoginRequest): Promise<ConnectionRecord> {
    if (input.label) return this.createConnection(actor, normalizeLabel(input.label));
    const existing = await this.dao.connections.lock(input.connectionId!);
    if (!existing) throw new SoftwareError("connection_unavailable");
    if (existing.providerKind !== this.provider) throw new SoftwareError("provider_unsupported");
    return existing;
  }

  private async createConnection(actor: SessionPrincipal, label: string) {
    const runtimeProviderId = `${this.provider}-${randomUUID().replaceAll("-", "").slice(0, PROVIDER_ID_SUFFIX_LENGTH)}`;
    const created = await this.dao.connections.insert({ label, providerKind: this.provider, runtimeProviderId, actorId: actor.userId });
    await this.dao.audit.append({ actorId: actor.userId, event: "connection.created", diff: { connectionId: created.id, label, providerKind: this.provider } });
    return created;
  }

  private async insertOperation(actor: SessionPrincipal, connectionId: string, idempotencyKey: string) {
    const nonceDigest = createHash("sha256").update(randomBytes(NONCE_BYTES)).digest("hex");
    const kind = this.provider === "codex" ? "codex_login" : "claude_login";
    try {
      return await this.dao.operations.insert({ connectionId, kind, expiresAt: this.clock(), actorId: actor.userId, idempotencyKey, nonceDigest });
    } catch (error) {
      if (error instanceof SoftwareError) throw error;
      throw new SoftwareError("service_unavailable");
    }
  }
}
