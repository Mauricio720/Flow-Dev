import type { SessionPrincipal } from "../context";
import type { LocalProjectLinkService } from "../application/services/local-execution/localProjectLinkService";

export class LocalProjectLinkController {
  constructor(private readonly links: LocalProjectLinkService) {}

  mine(actor: SessionPrincipal, projectId: string) {
    return this.links.mine(actor, projectId);
  }

  unlink(actor: SessionPrincipal, input: { projectId: string; linkId: string; expectedRevision: number; requestKey: string }) {
    return this.links.unlink(actor, input);
  }

  publish(input: Parameters<LocalProjectLinkService["publish"]>[0]) {
    return this.links.publish(input).then((link) => ({ linkId: link.id, revision: link.revision, safeLabel: link.safeLabel, repositoryId: link.repositoryId, repositoryNodeId: link.repositoryNodeId }));
  }
}
