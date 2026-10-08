import type { LocalConnectorDao, LocalProjectLinkRecord } from "../../database/dao/localConnectorDao";
import type { SessionPrincipal } from "../../../context";
import type { RepositoryAccessService } from "../projects/repositoryAccessService";
import { LocalExecutionError } from "./localExecutionErrors";
import { resolveLocalRepository } from "./localRepositoryAccess";
import { hashSecret } from "./localSecrets";

const UUID_PATTERN = /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i;
const OPAQUE_KEY_PATTERN = /^[a-f0-9]{64}$/i;
const MACHINE_OFFLINE_MS = 30_000;

type PublishInput = {
  token: string;
  protocolVersion: number;
  projectId: string;
  checkoutHandle: string;
  checkoutKey: string;
  repositoryOwner: string;
  repositoryName: string;
  safeLabel: string;
  expectedRevision: number;
  requestKey: string;
};

export class LocalProjectLinkService {
  constructor(private readonly dao: LocalConnectorDao, private readonly repositories: RepositoryAccessService, private readonly now: () => Date = () => new Date()) {}

  async publish(input: PublishInput) {
    if (input.protocolVersion !== 1) throw new LocalExecutionError("protocol_incompatible");
    if (!UUID_PATTERN.test(input.projectId) || !UUID_PATTERN.test(input.requestKey) || !OPAQUE_KEY_PATTERN.test(input.checkoutHandle) || !OPAQUE_KEY_PATTERN.test(input.checkoutKey) || !Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 0) throw new LocalExecutionError("invalid_input");
    const safeLabel = sanitizeLabel(input.safeLabel);
    const machine = await this.dao.machineByCredentialHash(hashSecret(input.token), this.now());
    if (!machine) throw new LocalExecutionError("machine_unauthorized");
    const repository = await this.resolveRepository({ userId: machine.ownerUserId }, input.projectId);
    if (repository.owner.toLowerCase() !== input.repositoryOwner.trim().toLowerCase() || repository.name.toLowerCase() !== input.repositoryName.trim().toLowerCase()) throw new LocalExecutionError("repository_mismatch");
    const current = await this.dao.currentProjectLink({ ownerUserId: machine.ownerUserId, projectId: input.projectId });
    if (current && (current.repositoryId !== repository.githubId || current.repositoryNodeId !== repository.nodeId)) throw new LocalExecutionError("repository_mismatch");
    return this.dao.publishProjectLink({
      ownerUserId: machine.ownerUserId,
      projectId: input.projectId,
      expectedRevision: input.expectedRevision,
      requestKey: input.requestKey,
      descriptor: { machineId: machine.id, checkoutHandle: input.checkoutHandle, checkoutKey: input.checkoutKey, repositoryId: repository.githubId, repositoryNodeId: repository.nodeId, safeLabel },
      now: this.now(),
    });
  }

  async mine(actor: SessionPrincipal, projectId: string) {
    const repository = await this.resolveRepository(actor, projectId);
    const link = await this.dao.currentProjectLink({ ownerUserId: actor.userId, projectId });
    if (!link) return null;
    const machine = await this.dao.machineById({ ownerUserId: actor.userId, machineId: link.machineId });
    if (!machine || link.repositoryId !== repository.githubId || link.repositoryNodeId !== repository.nodeId) return { linkId: link.id, revision: link.revision, machineLabel: machine?.label ?? "Máquina indisponível", projectLabel: link.safeLabel, readiness: "blocked" as const, readinessCode: machine ? "repository_mismatch" : "machine_unavailable" };
    const now = this.now().getTime();
    const live = machine.revokedAt === null && machine.credentialExpiresAt.getTime() > now && machine.lastHeartbeatAt !== null && now - machine.lastHeartbeatAt.getTime() < MACHINE_OFFLINE_MS;
    const ready = live && link.readiness === "ready";
    return { linkId: link.id, revision: link.revision, machineLabel: machine.label, projectLabel: link.safeLabel, readiness: ready ? "ready" as const : live ? "checking" as const : "blocked" as const, readinessCode: ready ? null : live ? "readiness_pending" : machine.revokedAt ? "machine_revoked" : "machine_offline" };
  }

  async unlink(actor: SessionPrincipal, input: { projectId: string; linkId: string; expectedRevision: number; requestKey: string }) {
    if (!UUID_PATTERN.test(input.projectId) || !UUID_PATTERN.test(input.linkId) || !UUID_PATTERN.test(input.requestKey)) throw new LocalExecutionError("invalid_input");
    await this.resolveRepository(actor, input.projectId);
    const link = await this.dao.revokeProjectLink({ ownerUserId: actor.userId, ...input, now: this.now() });
    return { status: "unlinked" as const, linkId: link.id, revision: link.revision };
  }

  private resolveRepository(actor: SessionPrincipal, projectId: string) {
    return resolveLocalRepository(this.repositories, actor, projectId);
  }
}

export function localProjectLinkDto(link: LocalProjectLinkRecord, machineLabel: string) {
  return { linkId: link.id, revision: link.revision, machineLabel, projectLabel: link.safeLabel, readiness: link.readiness, readinessCode: null };
}

function sanitizeLabel(value: string) {
  const label = value.trim().replace(/[\u0000-\u001f\u007f/\\]/g, " ").replace(/\s+/g, " ").slice(0, 80);
  if (!label) throw new LocalExecutionError("invalid_input");
  return label;
}
