import type { SessionPrincipal } from "../context";
import type { IssueDeletionService } from "../application/services/issue-deletion/issueDeletionService";
import type { DeletionTarget, RetryDeletionInput, StartDeletionInput } from "../application/services/issue-deletion/issueDeletionContracts";

export class IssueDeletionController {
  constructor(private readonly service: IssueDeletionService) {}

  preview(actor: SessionPrincipal, target: DeletionTarget) {
    return this.service.preview(actor, target);
  }

  start(actor: SessionPrincipal, input: StartDeletionInput) {
    return this.service.start(actor, input);
  }

  status(actor: SessionPrincipal, operationId: string) {
    return this.service.status(actor, operationId);
  }

  retry(actor: SessionPrincipal, input: RetryDeletionInput) {
    return this.service.retry(actor, input);
  }
}
