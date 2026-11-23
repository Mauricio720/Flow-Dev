import type { SessionPrincipal } from "../context";
import type { LocalCheckoutService, SaveLocalCheckoutRequest } from "../application/services/projects/localCheckoutService";

export class LocalCheckoutController {
  constructor(private readonly service: LocalCheckoutService) {}

  get(actor: SessionPrincipal, projectId: string) {
    return this.service.get(actor, projectId);
  }

  save(actor: SessionPrincipal, input: SaveLocalCheckoutRequest) {
    return this.service.save(actor, input);
  }

  pickFolder(actor: SessionPrincipal, projectId: string) {
    return this.service.pickFolder(actor, projectId);
  }

  remove(actor: SessionPrincipal, projectId: string) {
    return this.service.remove(actor, projectId);
  }
}
