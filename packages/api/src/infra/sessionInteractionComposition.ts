import type { WorkAuthorization } from "../application/services/assigned-issues/workAuthorization";
import { SessionControlAuthorization } from "../application/services/terminal/sessionControlAuthorization";
import { SessionInteractionController } from "../controllers/sessionInteractionController";
import { SessionRequestController } from "../controllers/sessionRequestController";
import { SessionTimelineController } from "../controllers/sessionTimelineController";
import { RouteSwitchController } from "../controllers/routeSwitchController";
import { SessionTimelineReader } from "../application/services/terminal/sessionTimelineReader";
import type { RepositoryAccessService } from "../application/services/projects/repositoryAccessService";
import { createWorkAuthorization } from "./assignedIssuesComposition";
import { requireDatabase } from "./database/client";
import { requireSql } from "./database/client";
import { DrizzleSessionControlDao } from "./database/dao/terminal/drizzleSessionControlDao";
import { DrizzleIssueClaimDao } from "./database/dao/assigned-issues/drizzleIssueClaimDao";
import { DrizzleSessionTimelineDao } from "./database/dao/terminal/drizzleSessionTimelineDao";
import { DrizzleTerminalExecutionDao } from "./database/dao/terminal/drizzleTerminalExecutionDao";
import { TerminalExecutionReader } from "../application/services/terminal/terminalExecutionReader";
import { createRepositoryAccessService } from "./repositoryAccessFactory";
import { DrizzleSessionMessageDao } from "./database/dao/terminal/drizzleSessionMessageDao";
import { DrizzleSessionRequestDao } from "./database/dao/terminal/drizzleSessionRequestDao";
import { DrizzleTerminalSessionDao } from "./database/dao/terminal/drizzleTerminalSessionDao";
import { DrizzleRouteSwitchDao } from "./database/dao/terminal/drizzleRouteSwitchDao";
import { RouteSwitchService } from "../application/services/terminal/routeSwitchService";
import { ConsoleSessionLog, type SessionLog } from "../application/services/terminal/sessionLog";
import type { SecretAnswerSender } from "../application/terminal/secretAnswerTransport";
import { PostgresSecretAnswerSender } from "./database/postgresSecretAnswerSender";

type Database = ReturnType<typeof requireDatabase>;
export type SessionControllers = { interaction: SessionInteractionController; requests: SessionRequestController; routeSwitches: RouteSwitchController; timeline: SessionTimelineController };
export type SessionInteractionOverrides = { workAuthorization?: Pick<WorkAuthorization, "requireOperate">; repositories?: Pick<RepositoryAccessService, "requireRead">; secretAnswers?: SecretAnswerSender; now?: () => Date; log?: SessionLog };

export function createSessionControllers(database: Database, overrides: SessionInteractionOverrides = {}): SessionControllers {
  const authorization = overrides.workAuthorization ?? createWorkAuthorization(database);
  const control = new SessionControlAuthorization({ sessions: new DrizzleTerminalSessionDao(database), authorization });
  const requests = new DrizzleSessionRequestDao(database);
  const messages = new DrizzleSessionMessageDao(database);
  const log = overrides.log ?? new ConsoleSessionLog();
  const routeSwitchDao = new DrizzleRouteSwitchDao(database);
  const service = new RouteSwitchService({ routeSwitches: routeSwitchDao, messages, log, now: overrides.now ?? (() => new Date()) });
  const routeSwitches = new RouteSwitchController({ control, routeSwitches: routeSwitchDao, service, log });
  const interaction = new SessionInteractionController({ control, messages, controls: new DrizzleSessionControlDao(database), now: overrides.now });
  const execution = new TerminalExecutionReader(new DrizzleTerminalExecutionDao(database));
  const timeline = new SessionTimelineController({ repositories: overrides.repositories ?? createRepositoryAccessService(database), sessions: new DrizzleTerminalSessionDao(database), claims: new DrizzleIssueClaimDao(database), requests, expireUnconfirmed: (scope, now) => execution.expireUnconfirmed(scope, now), reader: new SessionTimelineReader(new DrizzleSessionTimelineDao(database)), now: overrides.now });
  return { interaction, requests: new SessionRequestController({ control, requests, secretAnswers: overrides.secretAnswers, now: overrides.now }), routeSwitches, timeline };
}

export function createProductionSessionControllers() {
  return createSessionControllers(requireDatabase(), { secretAnswers: new PostgresSecretAnswerSender(requireSql()) });
}
