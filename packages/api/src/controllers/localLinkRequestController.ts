import type { LocalLinkRequestService } from "../application/services/local-execution/localLinkRequestService";
import type { SessionPrincipal } from "../context";

export class LocalLinkRequestController {
  constructor(private readonly requests: LocalLinkRequestService) {}

  open(actor: SessionPrincipal, projectId: string) {
    return this.requests.open(actor, projectId);
  }

  latest(actor: SessionPrincipal, projectId: string) {
    return this.requests.latest(actor, projectId);
  }

  claim(input: Parameters<LocalLinkRequestService["claim"]>[0]) {
    return this.requests.claim(input);
  }

  settle(input: Parameters<LocalLinkRequestService["settle"]>[0]) {
    return this.requests.settle(input);
  }
}
