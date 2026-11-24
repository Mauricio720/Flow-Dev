import type { WorkAuthorization } from "../application/services/assigned-issues/workAuthorization";
import { SessionControlAuthorization } from "../application/services/terminal/sessionControlAuthorization";
import { SessionInteractionController } from "../controllers/sessionInteractionController";
import { SessionRequestController } from "../controllers/sessionRequestController";
import { SessionTimelineController } from "../controllers/sessionTimelineController";
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
import type { SecretAnswerSender } from "../application/terminal/secretAnswerTransport";
import { PostgresSecretAnswerSender } from "./database/postgresSecretAnswerSender";

type Database = ReturnType<typeof requireDatabase>;
export type SessionControllers = { interaction: SessionInteractionController; requests: SessionRequestController; timeline: SessionTimelineController };
export type SessionInteractionOverrides = { workAuthorization?: Pick<WorkAuthorization, "requireOperate">; repositories?: Pick<RepositoryAccessService, "requireRead">; secretAnswers?: SecretAnswerSender; now?: () => Date };

export function createSessionControllers(database: Database, overrides: SessionInteractionOverrides = {}): SessionControllers {
  const authorization = overrides.workAuthorization ?? createWorkAuthorization(database);
  const control = new SessionControlAuthorization({ sessions: new DrizzleTerminalSessionDao(database), authorization });
  const requests = new DrizzleSessionRequestDao(database);
  const interaction = new SessionInteractionController({ control, messages: new DrizzleSessionMessageDao(database), controls: new DrizzleSessionControlDao(database), now: overrides.now });
  const execution = new TerminalExecutionReader(new DrizzleTerminalExecutionDao(database));
  const timeline = new SessionTimelineController({ repositories: overrides.repositories ?? createRepositoryAccessService(database), sessions: new DrizzleTerminalSessionDao(database), claims: new DrizzleIssueClaimDao(database), requests, expireUnconfirmed: (scope, now) => execution.expireUnconfirmed(scope, now), reader: new SessionTimelineReader(new DrizzleSessionTimelineDao(database)), now: overrides.now });
  return { interaction, requests: new SessionRequestController({ control, requests, secretAnswers: overrides.secretAnswers, now: overrides.now }), timeline };
}

export function createProductionSessionControllers() {
  return createSessionControllers(requireDatabase(), { secretAnswers: new PostgresSecretAnswerSender(requireSql()) });
}
