import { randomUUID } from "node:crypto";
import { requireDatabase } from "./database/client";
import { DrizzleIssueDeletionDao } from "./database/dao/issue-deletion/drizzleIssueDeletionDao";
import { IssueDeletionService } from "../application/services/issue-deletion/issueDeletionService";
import { IssueDeletionWorker } from "../application/services/issue-deletion/issueDeletionWorker";
import { CoordinatedDeletionStop } from "../application/services/issue-deletion/coordinatedDeletionStop";
import { RepositoryDeletionAccess } from "../application/services/issue-deletion/repositoryDeletionAccess";
import type { DeletionAccess, DeletionProvider, TerminalFilesPurger } from "../application/services/issue-deletion/deletionPorts";
import type { IssueDeletionDao } from "../application/database/dao/issueDeletionDao";
import { DrizzleAccessDao } from "./database/dao/drizzleAccessDao";
import { DrizzleProjectDao } from "./database/dao/projects/drizzleProjectDao";
import { DrizzleRepositoryAuthorizationStore } from "./database/dao/drizzleRepositoryAuthorizationStore";
import { RepositoryAuthorizationService } from "../application/github/repositoryAuthorizationService";
import { ProjectAccessService } from "../application/services/access/projectAccessService";
import { createRepositoryAccessService } from "./repositoryAccessFactory";
import { oauthClient, tokenCipher } from "./composition";
import { GitHubHttpIssueDeletionGateway } from "./github/githubIssueDeletionGateway";
import { GitHubDeletionProvider } from "./issue-deletion/gitHubDeletionProvider";
import { IssueDeletionController } from "../controllers/issueDeletionController";
import { DrizzleTerminalAttachmentDao } from "./database/dao/terminal/drizzleTerminalAttachmentDao";
import { DiskAttachmentFileStore } from "./terminal/diskAttachmentFileStore";
import { TerminalTaskFilesPurger } from "./terminal/terminalTaskFilesPurger";
import { ConsoleSessionLog } from "../application/services/terminal/sessionLog";

export type IssueDeletionOverrides = {
  dao?: IssueDeletionDao;
  access?: DeletionAccess;
  provider?: DeletionProvider;
  clock?: () => Date;
  leaseMs?: number;
  terminalFiles?: TerminalFilesPurger;
};

function authorization(database: ReturnType<typeof requireDatabase>) {
  const cipher = tokenCipher();
  return new RepositoryAuthorizationService(new DrizzleRepositoryAuthorizationStore(database, cipher), oauthClient(), cipher);
}

export function createDeletionAccess(database: ReturnType<typeof requireDatabase>): DeletionAccess {
  const projects = new DrizzleProjectDao(database);
  const permissions = new DrizzleAccessDao(database);
  const repositories = createRepositoryAccessService(database);
  return new RepositoryDeletionAccess(new ProjectAccessService(projects, permissions), permissions, authorization(database), repositories);
}

export function createDeletionProvider(database: ReturnType<typeof requireDatabase>): DeletionProvider {
  return new GitHubDeletionProvider(new GitHubHttpIssueDeletionGateway(), authorization(database));
}

export function createIssueDeletionServices(database: ReturnType<typeof requireDatabase>, overrides: IssueDeletionOverrides = {}) {
  const clock = overrides.clock ?? (() => new Date());
  const dao = overrides.dao ?? new DrizzleIssueDeletionDao(database);
  const access = overrides.access ?? createDeletionAccess(database);
  const provider = overrides.provider ?? createDeletionProvider(database);
  const terminalFiles = overrides.terminalFiles ?? new TerminalTaskFilesPurger(new DrizzleTerminalAttachmentDao(database), new DiskAttachmentFileStore());
  const stop = new CoordinatedDeletionStop({ dao, log: new ConsoleSessionLog() });
  const service = new IssueDeletionService({ dao, access, provider, clock });
  const worker = new IssueDeletionWorker({ dao, access, provider, stop, owner: `deletion:${randomUUID()}`, clock, leaseMs: overrides.leaseMs ?? 60_000, terminalFiles });
  return { dao, access, provider, stop, service, worker };
}

export function createProductionIssueDeletionController() {
  const { service } = createIssueDeletionServices(requireDatabase());
  return new IssueDeletionController(service);
}

export function createProductionIssueDeletionWorker() {
  return createIssueDeletionServices(requireDatabase()).worker;
}
