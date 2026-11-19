import type { SessionPrincipal } from "../../../context";
import type { AccessDao } from "../../database/dao/accessDao";
import type { ProjectRecord } from "../../database/dao/projectDao";
import type { ProjectCompozyBinding, ProjectCompozyBindingDao } from "../../database/dao/projectCompozyBindingDao";
import type { CompozyGateway } from "../../compozy/compozyGateway";
import type { ProjectAccessService } from "../access/projectAccessService";
import { TaskError } from "../tasks/taskErrors";
import type { CheckoutVerifier } from "./checkoutVerifier";
import { validateCheckoutPath } from "./checkoutRules";

export type ProjectCompozyDependencies = { bindings: ProjectCompozyBindingDao; access: ProjectAccessService; permissions: AccessDao; verifier: CheckoutVerifier; gateway: CompozyGateway; clock?: () => Date };
export type SaveBindingInput = { projectId: string; checkoutPath: string; expectedRevision?: number };
export type CheckBindingInput = { projectId: string; expectedRevision: number };

export class ProjectCompozyService {
  private readonly clock: () => Date;

  constructor(private readonly dependencies: ProjectCompozyDependencies) {
    this.clock = dependencies.clock ?? (() => new Date());
  }

  async get(actor: SessionPrincipal, projectId: string) {
    await this.dependencies.access.requireProject(actor, projectId);
    const [binding, compozy, canEdit] = await Promise.all([this.dependencies.bindings.find(projectId), this.dependencies.gateway.health(), this.dependencies.permissions.isAdmin(actor.userId)]);
    return { binding, compozy, canEdit };
  }

  async save(actor: SessionPrincipal, input: SaveBindingInput) {
    const project = await this.requireAdminProject(actor, input.projectId);
    const checkoutPath = validateCheckoutPath(input.checkoutPath);
    const current = await this.dependencies.bindings.find(project.id);
    assertRevision(current, input.expectedRevision);
    return this.verifyAndStore({ actor, project, checkoutPath, current });
  }

  async check(actor: SessionPrincipal, input: CheckBindingInput) {
    const project = await this.requireAdminProject(actor, input.projectId);
    const current = await this.dependencies.bindings.find(project.id);
    if (!current) throw new TaskError("binding_conflict");
    assertRevision(current, input.expectedRevision);
    return this.verifyAndStore({ actor, project, checkoutPath: current.checkoutPath, current });
  }

  private async verifyAndStore(input: { actor: SessionPrincipal; project: ProjectRecord; checkoutPath: string; current: ProjectCompozyBinding | null }) {
    const repository = input.project.repository;
    if (!repository) throw new TaskError("project_unavailable");
    const verification = await this.dependencies.verifier.verify(input.checkoutPath, repository);
    const write = { ...verification, projectId: input.project.id, checkoutPath: input.checkoutPath, checkedAt: this.clock(), actorId: input.actor.userId };
    const { bindings } = this.dependencies;
    const stored = input.current ? await bindings.update(write, input.current.revision) : await bindings.insert(write);
    if (!stored) throw new TaskError("binding_conflict");
    return stored;
  }

  private async requireAdminProject(actor: SessionPrincipal, projectId: string) {
    if (!(await this.dependencies.permissions.isAdmin(actor.userId))) throw new TaskError("forbidden");
    return this.dependencies.access.requireProject(actor, projectId);
  }
}

function assertRevision(current: ProjectCompozyBinding | null, expectedRevision: number | undefined) {
  if (current?.revision !== expectedRevision) throw new TaskError("binding_conflict");
}
