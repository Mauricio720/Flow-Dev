import { ConnectorPairingService } from "../application/services/local-execution/connectorPairingService";
import { LocalMachineService } from "../application/services/local-execution/localMachineService";
import { LocalExecutionError } from "../application/services/local-execution/localExecutionErrors";
import { LocalMachineController } from "../controllers/localMachineController";
import { LocalProjectLinkController } from "../controllers/localProjectLinkController";
import { LocalLinkRequestService } from "../application/services/local-execution/localLinkRequestService";
import { LocalLinkRequestController } from "../controllers/localLinkRequestController";
import { DrizzleLocalLinkRequestDao } from "./database/dao/local-execution/drizzleLocalLinkRequestDao";
import { LocalProjectLinkService } from "../application/services/local-execution/localProjectLinkService";
import { DrizzleLocalConnectorDao } from "./database/dao/local-execution/drizzleLocalConnectorDao";
import { requireDatabase } from "./database/client";
import { createRepositoryAccessService } from "./repositoryAccessFactory";

export function createLocalMachineService(environment: NodeJS.ProcessEnv = process.env) {
  const encryptionKey = environment.LOCAL_CONNECTOR_TOKEN_ENCRYPTION_KEY?.trim();
  if (!encryptionKey || Buffer.from(encryptionKey, "base64").length !== 32) throw new LocalExecutionError("service_unavailable");
  const dao = new DrizzleLocalConnectorDao(requireDatabase());
  return new LocalMachineService(dao, new ConnectorPairingService(dao, encryptionKey), encryptionKey);
}

export function createProductionLocalMachineController() {
  return new LocalMachineController(createLocalMachineService());
}

export function createProductionLocalProjectLinkController() {
  const database = requireDatabase();
  const dao = new DrizzleLocalConnectorDao(database);
  return new LocalProjectLinkController(new LocalProjectLinkService(dao, createRepositoryAccessService(database)));
}

export function createProductionLocalLinkRequestController() {
  const database = requireDatabase();
  const dependencies = { requests: new DrizzleLocalLinkRequestDao(database), connector: new DrizzleLocalConnectorDao(database), repositories: createRepositoryAccessService(database) };
  return new LocalLinkRequestController(new LocalLinkRequestService(dependencies));
}
