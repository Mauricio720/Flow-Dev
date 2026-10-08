import type { SessionPrincipal } from "../../../context";
import type { SoftwareDao } from "../../database/dao/softwareDao";
import type { CompozyControlGateway } from "../../software/compozyControlGateway";
import type { CredentialBroker } from "../../software/credentialBroker";
import type { HostDiagnostics } from "../../software/hostDiagnostics";
import { ProviderLoginService, type BeginLoginRequest } from "./providerLoginService";
import { connectionReadiness } from "./connectionReadiness";
import { ConnectionService, type DisconnectInput, type ListInput, type RenameInput } from "./connectionService";
import { LoginConfirmService } from "./loginConfirmService";
import { LoginProgressService, type ConfirmInput } from "./loginProgressService";
import { ReadinessService } from "./readinessService";
import { SettingsService, type SaveSettingsInput } from "./settingsService";
import { SoftwareHistoryService } from "./softwareHistoryService";
import { NO_ACTIVE_RUNS, type ActiveRunCounter } from "./activeRuns";
import type { Clock } from "./softwareAccess";

export type SoftwareDependencies = {
  dao: SoftwareDao;
  broker: CredentialBroker;
  gateway: CompozyControlGateway;
  host: HostDiagnostics;
  activeRuns?: ActiveRunCounter;
  clock?: Clock;
};

export class SoftwareService {
  private readonly settings: SettingsService;
  private readonly connections: ConnectionService;
  private readonly codexLogin: ProviderLoginService;
  private readonly claudeLogin: ProviderLoginService;
  private readonly progress: LoginProgressService;
  private readonly confirmation: LoginConfirmService;
  private readonly readinessService: ReadinessService;
  private readonly audit: SoftwareHistoryService;

  constructor(private readonly deps: SoftwareDependencies) {
    const { dao, broker, gateway, host, activeRuns, clock } = deps;
    this.settings = new SettingsService(dao);
    this.connections = new ConnectionService(dao, { broker, gateway, activeRuns, clock });
    this.codexLogin = new ProviderLoginService(dao, broker, "codex", clock);
    this.claudeLogin = new ProviderLoginService(dao, broker, "claude", clock);
    this.progress = new LoginProgressService(dao, broker, clock);
    this.confirmation = new LoginConfirmService(dao, broker, gateway, clock);
    this.readinessService = new ReadinessService(dao, { gateway, host, clock });
    this.audit = new SoftwareHistoryService(dao);
  }

  settingsFor = (actor: SessionPrincipal) => this.settings.get(actor);
  saveSettings = (actor: SessionPrincipal, input: SaveSettingsInput) => this.settings.save(actor, input);
  readiness = (actor: SessionPrincipal) => this.readinessService.readiness(actor);
  history = (actor: SessionPrincipal, query: { cursor?: string; limit: number }) => this.audit.history(actor, query);
  beginCodexLogin = (actor: SessionPrincipal, input: BeginLoginRequest) => this.codexLogin.begin(actor, input);
  beginClaudeLogin = (actor: SessionPrincipal, input: BeginLoginRequest) => this.claudeLogin.begin(actor, input);
  pollLogin = (actor: SessionPrincipal, operationId: string) => this.progress.poll(actor, operationId);
  confirmAccount = (actor: SessionPrincipal, input: ConfirmInput) => this.confirmation.confirm(actor, input);
  disconnect = (actor: SessionPrincipal, input: DisconnectInput) => this.connections.disconnect(actor, input);
  renameConnection = (actor: SessionPrincipal, input: RenameInput) => this.connections.rename(actor, input);

  async listConnections(actor: SessionPrincipal, input: ListInput) {
    const page = await this.connections.list(actor, input);
    const projection = await this.readinessService.fresh();
    const counter = this.deps.activeRuns ?? NO_ACTIVE_RUNS;
    const items = await Promise.all(page.items.map(async (connection) => ({
      connection,
      readiness: await connectionReadiness({ connection, projection, gateway: this.deps.gateway }),
      activeRuns: await counter.countActive(connection.id),
    })));
    return { items, nextCursor: page.nextCursor, sharedBlockers: projection.layers };
  }
}
