import { join } from "node:path";
import { homedir } from "node:os";
import { ReadinessService } from "../application/services/software/readinessService";
import { SoftwareService } from "../application/services/software/softwareService";
import { SoftwareController } from "../controllers/softwareController";
import { requireDatabase } from "./database/client";
import { DrizzleTaskFlowDao } from "./database/dao/tasks/drizzleTaskFlowDao";
import { DrizzleSoftwareDao } from "./database/dao/software/drizzleSoftwareDao";
import { ClaudeLoginDriver } from "./spec/compozy/claudeLoginDriver";
import { CodexAppServerDriver } from "./spec/compozy/codexAppServerDriver";
import { PinnedCompozyControlGateway } from "./spec/compozy/compozyControlGateway";
import { CompozyTransportError, unixSocketTransport, type CompozyTransport } from "./spec/compozy/compozyTransport";
import { HostCredentialBroker } from "./spec/compozy/credentialBroker";
import { CredentialHomes } from "./spec/compozy/credentialHomes";
import { collectHostChecks } from "./spec/compozy/hostReadiness";
import { productionConfigurationProbe } from "./spec/specConfigurationProbe";

const DEFAULT_CREDENTIAL_ROOT = join(homedir(), ".flow-dev", "software-credentials");

function controlTransport(socketPath: string | undefined): CompozyTransport {
  if (socketPath) return unixSocketTransport(socketPath);
  return async () => { throw new CompozyTransportError("connection", "control socket is not configured"); };
}

export function createSoftwareRuntime(environment: NodeJS.ProcessEnv = process.env) {
  const credentialRoot = environment.SOFTWARE_CREDENTIAL_ROOT?.trim() || DEFAULT_CREDENTIAL_ROOT;
  const gateway = new PinnedCompozyControlGateway({
    transport: controlTransport(environment.SOFTWARE_COMPOZY_SOCKET?.trim()),
    declaredOpenApiSha256: environment.SPEC_COMPOZY_OPENAPI_SHA256?.trim() ?? "",
  });
  const broker = new HostCredentialBroker({ homes: new CredentialHomes(credentialRoot), driver: new CodexAppServerDriver(), claudeDriver: new ClaudeLoginDriver() });
  const host = { collect: () => collectHostChecks({ ...environment, SOFTWARE_CREDENTIAL_ROOT: credentialRoot }, productionConfigurationProbe) };
  const dao = new DrizzleSoftwareDao(requireDatabase());
  const readiness = new ReadinessService(dao, { gateway, host });
  return { gateway, broker, host, dao, readiness };
}

export function createSoftwareService(environment: NodeJS.ProcessEnv = process.env) {
  const { gateway, broker, host, dao } = createSoftwareRuntime(environment);
  return new SoftwareService({ dao, broker, gateway, host, activeRuns: { countActive: (id) => new DrizzleTaskFlowDao(requireDatabase()).runs.countActiveForConnection(id) } });
}

export function createProductionSoftwareController() {
  return new SoftwareController(createSoftwareService());
}
