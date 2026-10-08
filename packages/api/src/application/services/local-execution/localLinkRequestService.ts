import type { SessionPrincipal } from "../../../context";
import type { LocalConnectorDao, MachineRecord } from "../../database/dao/localConnectorDao";
import type { LinkRequestOutcome, LinkRequestRecord, LocalLinkRequestDao } from "../../database/dao/localLinkRequestDao";
import type { RepositoryAccessService } from "../projects/repositoryAccessService";
import { LocalExecutionError } from "./localExecutionErrors";
import { resolveLocalRepository } from "./localRepositoryAccess";
import { hashSecret } from "./localSecrets";

const REQUEST_LIFETIME_MS = 5 * 60_000;
const MACHINE_OFFLINE_MS = 30_000;
const MACHINE_SCAN_LIMIT = 50;
const SUPPORTED_PROTOCOL = 1;
const REASON_PATTERN = /^[a-z_]{1,64}$/;
const EXPIRED_REASON = "request_expired";
const PROJECT_UNAVAILABLE_REASON = "project_unavailable";

type Dependencies = { requests: LocalLinkRequestDao; connector: LocalConnectorDao; repositories: RepositoryAccessService };
type MachineCall = { token: string; protocolVersion: number };
type Settlement = MachineCall & { requestId: string; outcome: LinkRequestOutcome; reason?: string | null };

export class LocalLinkRequestService {
  constructor(private readonly deps: Dependencies, private readonly now: () => Date = () => new Date()) {}

  async open(actor: SessionPrincipal, projectId: string) {
    await resolveLocalRepository(this.deps.repositories, actor, projectId);
    if (!await this.hasLiveMachine(actor.userId)) throw new LocalExecutionError("connector_unavailable");
    const current = await this.deps.connector.currentProjectLink({ ownerUserId: actor.userId, projectId });
    const expiresAt = new Date(this.now().getTime() + REQUEST_LIFETIME_MS);
    return this.view(await this.deps.requests.open({ ownerUserId: actor.userId, projectId, expectedRevision: current?.revision ?? 0, expiresAt }));
  }

  async latest(actor: SessionPrincipal, projectId: string) {
    const request = await this.deps.requests.latest({ ownerUserId: actor.userId, projectId });
    return request ? this.view(request) : null;
  }

  async claim(input: MachineCall) {
    const machine = await this.machine(input);
    const request = await this.deps.requests.claim({ ownerUserId: machine.ownerUserId, machineId: machine.id, now: this.now() });
    if (!request) return { request: null };
    try {
      const repository = await resolveLocalRepository(this.deps.repositories, { userId: machine.ownerUserId }, request.projectId);
      return { request: { requestId: request.id, projectId: request.projectId, repositoryOwner: repository.owner, repositoryName: repository.name, expectedRevision: request.expectedRevision } };
    } catch {
      await this.deps.requests.settle({ requestId: request.id, machineId: machine.id, state: "failed", reason: PROJECT_UNAVAILABLE_REASON });
      return { request: null };
    }
  }

  async settle(input: Settlement) {
    const machine = await this.machine(input);
    const reason = input.outcome === "failed" ? input.reason ?? "" : null;
    if (reason !== null && !REASON_PATTERN.test(reason)) throw new LocalExecutionError("invalid_input");
    const settled = await this.deps.requests.settle({ requestId: input.requestId, machineId: machine.id, state: input.outcome, reason });
    return { settled };
  }

  private async machine(input: MachineCall) {
    if (input.protocolVersion !== SUPPORTED_PROTOCOL) throw new LocalExecutionError("protocol_incompatible");
    const machine = await this.deps.connector.machineByCredentialHash(hashSecret(input.token), this.now());
    if (!machine) throw new LocalExecutionError("machine_unauthorized");
    return machine;
  }

  private async hasLiveMachine(ownerUserId: string) {
    const page = await this.deps.connector.listMachines({ ownerUserId, limit: MACHINE_SCAN_LIMIT });
    return page.items.some((machine) => this.isLive(machine));
  }

  private isLive(machine: MachineRecord) {
    const now = this.now().getTime();
    if (machine.revokedAt !== null || machine.lastHeartbeatAt === null) return false;
    return machine.credentialExpiresAt.getTime() > now && now - machine.lastHeartbeatAt.getTime() < MACHINE_OFFLINE_MS;
  }

  private view(request: LinkRequestRecord) {
    const open = request.state === "pending" || request.state === "claimed";
    if (open && request.expiresAt.getTime() <= this.now().getTime()) return { requestId: request.id, state: "failed" as const, reason: EXPIRED_REASON };
    return { requestId: request.id, state: request.state, reason: request.reason };
  }
}
