import { AccessController } from "../controllers/accessController";
import { ProjectsController } from "../controllers/projectsController";
import { AssignmentService } from "../application/services/access/assignmentService";
import { requireDatabase } from "./database/client";
import { DrizzleAccessDao } from "./database/dao/drizzleAccessDao";
import { DrizzleProjectDao } from "./database/dao/projects/drizzleProjectDao";
import { DrizzleRepositoryAuthorizationStore } from "./database/dao/drizzleRepositoryAuthorizationStore";
import { GitHubHttpRepositoryGateway } from "./github/githubRepositoryGateway";
import { GitHubRepositoryOAuthClient } from "./github/githubRepositoryOAuthClient";
import { RepositoryAuthorizationService } from "../application/github/repositoryAuthorizationService";
import { TokenCipher } from "../application/github/tokenCipher";
import { RepositoryOAuthController } from "../controllers/repositoryOAuthController";
import { TasksController } from "../controllers/tasksController";
import { RepositoryAccessService } from "../application/services/projects/repositoryAccessService";
import { DrizzleTaskDao } from "./database/dao/tasks/drizzleTaskDao";
import { DrizzleTaskCaptureDao } from "./database/dao/tasks/drizzleTaskCaptureDao";
import { TranscriptionController } from "../controllers/transcriptionController";
import { AudioValidator } from "./transcription/audioValidator";
import { GroqTranscriptionGateway } from "./transcription/groqTranscriptionGateway";
import { DrizzleWorkerOperationDao } from "./database/dao/tasks/drizzleTaskOperationDao";
import { TaskWorkerController } from "../controllers/taskWorkerController";
import { DevControlIssueAuthorGateway } from "./issue-author/devControlIssueAuthorGateway";
import { patientFetch } from "./http/patientFetch";
import { DrizzleIssueContextDao } from "./database/dao/tasks/drizzleIssueContextDao";
import { GitHubScopedContextGateway } from "./github/scopedContextGateway";
import { IssueContextController } from "../controllers/issueContextController";
import { TaskPublicationController } from "../controllers/taskPublicationController";
import { DrizzleTaskPublicationDao } from "./database/dao/tasks/drizzleTaskPublicationDao";
import { GitHubHttpIssueGateway } from "./github/githubIssueGateway";
import { DrizzleTaskPublicationWorkerDao } from "./database/dao/tasks/drizzleTaskPublicationWorkerDao";
import { GitHubHttpProjectBoardGateway } from "./github/githubProjectBoardGateway";
import { BacklogPlacementService } from "../application/services/projects/backlogPlacementService";
import { createPlanningWorkerController } from "./planningComposition";
import { createRepositoryAccessService } from "./repositoryAccessFactory";
import { TaskPublicationWorkerController } from "../controllers/taskPublicationWorkerController";

export function createProductionProjectsController() {
  const database = requireDatabase();
  const access = new DrizzleAccessDao(database);
  const github = new GitHubHttpRepositoryGateway();
  const authorization = new RepositoryAuthorizationService(new DrizzleRepositoryAuthorizationStore(database, tokenCipher()), oauthClient(), tokenCipher());
  return new ProjectsController(new DrizzleProjectDao(database), access, { github, authorization, boards: new GitHubHttpProjectBoardGateway() });
}

export function createProductionAccessController() {
  const database = requireDatabase();
  const access = new DrizzleAccessDao(database);
  return new AccessController(new AssignmentService(access), access);
}

export function createProductionTasksController() {
  const database = requireDatabase();
  return new TasksController(new DrizzleTaskDao(database), createRepositoryAccessService(database));
}

export function createProductionTranscriptionController() {
  const database = requireDatabase();
  return new TranscriptionController(new DrizzleTaskDao(database), new DrizzleTaskCaptureDao(database), createRepositoryAccessService(database), new AudioValidator(), new GroqTranscriptionGateway());
}

export function createProductionTaskWorkerController() {
  const database = requireDatabase();
  const operations = new DrizzleWorkerOperationDao(database);
  const publications = new TaskPublicationWorkerController(new DrizzleTaskPublicationWorkerDao(database), new DrizzleTaskDao(database), createRepositoryAccessService(database), new GitHubHttpIssueGateway(), crypto.randomUUID(), createBacklogPlacementService(database), new GitHubHttpIssueGateway());
  const planning = createPlanningWorkerController(database);
  return new TaskWorkerController(operations, new DevControlIssueAuthorGateway(undefined, undefined, patientFetch, (executionId, toolCallId) => operations.hasActivity(executionId, toolCallId)), crypto.randomUUID(), publications, planning);
}

export function createProductionIssueContextController() {
  const database = requireDatabase();
  return new IssueContextController(new DrizzleIssueContextDao(database), createRepositoryAccessService(database), new GitHubScopedContextGateway());
}

export function createProductionTaskPublicationController() {
  const database = requireDatabase();
  return new TaskPublicationController(new DrizzleTaskDao(database), new DrizzleTaskPublicationDao(database), createRepositoryAccessService(database), new GitHubHttpIssueGateway(), createBacklogPlacementService(database));
}

export function createBacklogPlacementService(database: ReturnType<typeof requireDatabase>) {
  return new BacklogPlacementService(new DrizzleProjectDao(database), new GitHubHttpProjectBoardGateway());
}


export function tokenCipher() { const key = process.env.GITHUB_REPOSITORY_TOKEN_KEY; if (!key) throw new Error("GITHUB_REPOSITORY_TOKEN_KEY is required"); return new TokenCipher(key); }
export function oauthClient() { const clientId = process.env.GITHUB_REPOSITORY_CLIENT_ID; const clientSecret = process.env.GITHUB_REPOSITORY_CLIENT_SECRET; if (!clientId || !clientSecret) throw new Error("Repository OAuth environment is incomplete"); return new GitHubRepositoryOAuthClient({ clientId, clientSecret, apiBase: "https://api.github.com" }); }

export function createProductionRepositoryOAuthController() {
  const database = requireDatabase();
  const store = new DrizzleRepositoryAuthorizationStore(database, tokenCipher());
  const origin = process.env.BETTER_AUTH_URL;
  const clientId = process.env.GITHUB_REPOSITORY_CLIENT_ID;
  if (!origin || !clientId) throw new Error("Repository OAuth environment is incomplete");
  return new RepositoryOAuthController(new RepositoryAuthorizationService(store, oauthClient(), tokenCipher()), store, { origin: new URL(origin).origin, clientId, callbackUrl: new URL("/api/github-repositories/callback", origin).toString() });
}
