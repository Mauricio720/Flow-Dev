import { COMPOZY_PIN } from "../application/spec/specPins";
import type { SoftwareService } from "../application/services/software/softwareService";
import type { SessionPrincipal } from "../context";
import { SOFTWARE_DEFAULT_PAGE_SIZE } from "../schemas/software";
import { toAuditDto, toConnectionDto, toReadinessDto } from "./softwareDtos";

type Page = { cursor?: string; limit?: number };
type Paged = Page & { search?: string };

const pageOf = <T extends Page>(input: T) => ({ ...input, limit: input.limit ?? SOFTWARE_DEFAULT_PAGE_SIZE });

export class SoftwareController {
  constructor(private readonly service: SoftwareService) {}

  async get(actor: SessionPrincipal) {
    const settings = await this.service.settingsFor(actor);
    return { ...settings, runtime: { pinnedRelease: COMPOZY_PIN.release } };
  }

  async readiness(actor: SessionPrincipal) {
    return toReadinessDto(await this.service.readiness(actor));
  }

  async connections(actor: SessionPrincipal, input: Paged) {
    const page = await this.service.listConnections(actor, pageOf(input));
    return { items: page.items.map(toConnectionDto), nextCursor: page.nextCursor, sharedBlockers: Object.values(page.sharedBlockers) };
  }

  async history(actor: SessionPrincipal, input: Page) {
    const page = await this.service.history(actor, pageOf(input));
    return { items: page.items.map(toAuditDto), nextCursor: page.nextCursor };
  }

  saveSettings(actor: SessionPrincipal, input: Parameters<SoftwareService["saveSettings"]>[1]) {
    return this.service.saveSettings(actor, input);
  }

  beginCodexLogin(actor: SessionPrincipal, input: Parameters<SoftwareService["beginCodexLogin"]>[1]) {
    return this.service.beginCodexLogin(actor, input);
  }

  beginClaudeLogin(actor: SessionPrincipal, input: Parameters<SoftwareService["beginClaudeLogin"]>[1]) {
    return this.service.beginClaudeLogin(actor, input);
  }

  pollLogin(actor: SessionPrincipal, input: { operationId: string }) {
    return this.service.pollLogin(actor, input.operationId);
  }

  confirmAccount(actor: SessionPrincipal, input: Parameters<SoftwareService["confirmAccount"]>[1]) {
    return this.service.confirmAccount(actor, input);
  }

  disconnect(actor: SessionPrincipal, input: Parameters<SoftwareService["disconnect"]>[1]) {
    return this.service.disconnect(actor, input);
  }

  renameConnection(actor: SessionPrincipal, input: Parameters<SoftwareService["renameConnection"]>[1]) {
    return this.service.renameConnection(actor, input);
  }
}
