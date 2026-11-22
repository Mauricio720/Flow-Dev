import type { SessionPrincipal } from "../../../context";
import type { AccessDao } from "../../database/dao/accessDao";
import type { LocalCheckoutDao, StoredLocalCheckout } from "../../database/dao/localCheckoutDao";
import type { ProjectDao, ProjectRecord } from "../../database/dao/projectDao";
import type { GitCheckoutInspector } from "../../terminal/gitCheckoutInspector";
import { ProjectAccessService } from "../access/projectAccessService";
import { CheckoutValidationError, StaleLocalCheckoutError } from "./localCheckoutErrors";
import { isValidCheckoutPath, matchesRepository, repositorySlugOf } from "./localCheckoutRules";

export type VerifiedCheckout = { path: string; branch: string | null; detachedSha: string | null; dirty: boolean };
export type LocalCheckoutDeps = { checkouts: LocalCheckoutDao; inspector: GitCheckoutInspector; projects: ProjectDao; permissions?: AccessDao; clock?: () => Date };
export type SaveLocalCheckoutRequest = { projectId: string; path: string; expectedVersion?: number };
export type LocalCheckoutView = { path: string; verifiedAt: string; version: number };

function toView(row: StoredLocalCheckout): LocalCheckoutView {
  return { path: row.path, verifiedAt: row.verifiedAt.toISOString(), version: row.version };
}

export function repositoryOf(project: ProjectRecord) {
  if (!project.repository) throw new Error("Project has no repository identity");
  return `${project.repository.owner}/${project.repository.name}`.toLowerCase();
}

function remoteLabels(remotes: string[]) {
  return [...new Set(remotes.map((remote) => repositorySlugOf(remote) ?? remote))];
}

export class LocalCheckoutService {
  private readonly access: ProjectAccessService;
  private readonly checkouts: LocalCheckoutDao;
  private readonly inspector: GitCheckoutInspector;
  private readonly clock: () => Date;

  constructor(deps: LocalCheckoutDeps) {
    this.access = new ProjectAccessService(deps.projects, deps.permissions);
    this.checkouts = deps.checkouts;
    this.inspector = deps.inspector;
    this.clock = deps.clock ?? (() => new Date());
  }

  async get(actor: SessionPrincipal, projectId: string) {
    await this.access.requireProject(actor, projectId);
    const row = await this.checkouts.find(actor.userId, projectId);
    return row ? toView(row) : null;
  }

  async save(actor: SessionPrincipal, input: SaveLocalCheckoutRequest) {
    const project = await this.access.requireProject(actor, input.projectId);
    const verified = await this.verify(input.path, repositoryOf(project));
    const saved = await this.checkouts.save({ userId: actor.userId, projectId: input.projectId, path: verified.path, verifiedAt: this.clock(), expectedVersion: input.expectedVersion });
    if (!saved) throw new StaleLocalCheckoutError();
    return toView(saved);
  }

  async remove(actor: SessionPrincipal, projectId: string) {
    await this.access.requireProject(actor, projectId);
    await this.checkouts.remove(actor.userId, projectId);
    return { removed: true as const };
  }

  async verify(path: string, repository: string): Promise<VerifiedCheckout> {
    if (!isValidCheckoutPath(path)) throw new CheckoutValidationError("checkout_path_invalid");
    const inspection = await this.inspector.inspect(path);
    if (inspection.kind === "missing") throw new CheckoutValidationError("checkout_not_found", { path });
    if (inspection.kind === "not_repository") throw new CheckoutValidationError("checkout_not_git_root");
    if (inspection.kind === "subfolder") throw new CheckoutValidationError("checkout_not_git_root", { root: inspection.root });
    if (!matchesRepository(inspection.remotes, repository)) throw new CheckoutValidationError("checkout_remote_mismatch", { repository, remotes: remoteLabels(inspection.remotes) });
    return { path: inspection.root, branch: inspection.branch, detachedSha: inspection.detachedSha, dirty: inspection.dirty };
  }
}
