// Server-only entry: router runtime, context factory and caller. Never import from client code.
export { appRouter } from "./routers/index";
export { createContext, type Context } from "./context";
export { createCallerFactory } from "./trpc";
export { db, sql, requireDatabase } from "./infra/database/client";
export * from "./infra/database/schema";
export { destinationProjectId, normalizeDestination } from "./application/auth/destination";
export { createProductionRepositoryOAuthController } from "./infra/composition";
export { createProductionTasksController, createProductionTranscriptionController } from "./infra/composition";
export { createProductionIssueContextController } from "./infra/composition";
export { oauthFailure } from "./controllers/repositoryOAuthController";
