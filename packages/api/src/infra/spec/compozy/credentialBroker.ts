import type { AttemptGrant, BeginLoginInput, CredentialBroker, GrantInput, LoginStart, LoginStatus } from "../../../application/software/credentialBroker";
import type { BrokerContext, LoginDrivers } from "./brokerContext";
import type { CodexLoginDriver } from "./codexLoginDriver";
import type { CredentialHomes } from "./credentialHomes";
import { LoginOperations } from "./loginOperations";
import { LoginSettler } from "./loginSettler";
import { beginLogin } from "./loginStarter";

export type BrokerDependencies = { homes: CredentialHomes; driver: CodexLoginDriver; claudeDriver?: CodexLoginDriver; now?: () => Date };

export class HostCredentialBroker implements CredentialBroker {
  private readonly context: BrokerContext;
  private readonly settler: LoginSettler;

  constructor(private readonly deps: BrokerDependencies) {
    const drivers: LoginDrivers = { codex: deps.driver, claude: deps.claudeDriver };
    this.context = { homes: deps.homes, drivers, operations: new LoginOperations(), now: deps.now ?? (() => new Date()) };
    this.settler = new LoginSettler(this.context);
  }

  beginCodexLogin(input: BeginLoginInput): Promise<LoginStart> {
    return beginLogin(this.context, "codex", input);
  }

  beginClaudeLogin(input: BeginLoginInput): Promise<LoginStart> {
    return beginLogin(this.context, "claude", input);
  }

  hasOperation(operationId: string) {
    return this.context.operations.find(operationId) !== undefined;
  }

  pollLogin(operationId: string): Promise<LoginStatus> {
    return this.settler.poll(operationId);
  }

  confirmLogin(operationId: string): Promise<LoginStatus> {
    return this.settler.confirm(operationId);
  }

  completeLogin(operationId: string) {
    return this.settler.complete(operationId);
  }

  rollbackLogin(operationId: string) {
    return this.settler.rollback(operationId);
  }

  async disconnect(connectionId: string, operationId = connectionId) {
    await this.deps.homes.remove(connectionId, operationId);
  }

  completeDisconnect(connectionId: string, operationId = connectionId) {
    return this.deps.homes.completeRemoval(connectionId, operationId);
  }

  rollbackDisconnect(connectionId: string, operationId = connectionId) {
    return this.deps.homes.rollbackRemoval(connectionId, operationId);
  }

  activeHome(connectionId: string) {
    return this.deps.homes.activeHome(connectionId);
  }

  async grantForAttempt(input: GrantInput): Promise<AttemptGrant> {
    if (!(await this.deps.homes.hasCredentials(input.connectionId))) throw new Error("auth_required");
    const mountPath = await this.deps.homes.createGrant(input);
    return { attemptId: input.attemptId, connectionId: input.connectionId, mountPath };
  }

  async releaseGrant(attemptId: string) {
    await this.deps.homes.releaseGrant(attemptId);
  }
}
