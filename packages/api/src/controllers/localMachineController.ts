import type { SessionPrincipal } from "../context";
import type { LocalMachineService } from "../application/services/local-execution/localMachineService";

export class LocalMachineController {
  constructor(private readonly machines: LocalMachineService) {}

  confirmPairing(actor: SessionPrincipal, input: { code: string; requestKey: string }) {
    return this.machines.confirmPairing({ ownerUserId: actor.userId, ...input });
  }

  previewPairing(code: string) {
    return this.machines.previewPairing(code);
  }

  list(actor: SessionPrincipal, input: { cursor?: string; limit: number }) {
    return this.machines.list(actor.userId, input);
  }

  revoke(actor: SessionPrincipal, input: { machineId: string; expectedRevision: number; requestKey: string }) {
    return this.machines.revoke({ ownerUserId: actor.userId, ...input });
  }

  createPairing(input: { protocolVersion: number; label: string; pollingSecret: string }) {
    return this.machines.createPairing(input);
  }

  exchange(input: { pairingId: string; pollingSecret: string; requestKey: string }) {
    return this.machines.exchange(input);
  }

  heartbeat(input: { token: string; protocolVersion: number; capabilities: string[]; catalogRevision: number; providerCatalog?: unknown; loopCatalog?: unknown; requestKey: string; acknowledgedCredentialGeneration?: number }) {
    return this.machines.heartbeat(input);
  }

  poll(input: { token: string; protocolVersion: number; limit: number }) { return this.machines.poll(input); }

  events(input: { token: string; protocolVersion: number; events: unknown[] }) { return this.machines.events(input); }

  unpair(input: { token: string; protocolVersion: number; requestKey: string }) { return this.machines.unpair(input); }

  consumeRateLimit(key: string, maximum: number) {
    return this.machines.consumeRateLimit(key, maximum);
  }
}
