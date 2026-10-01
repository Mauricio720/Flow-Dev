import { router } from "../trpc";
import { healthRouter } from "./health";
import { projectsRouter } from "./projects";
import { accessRouter } from "./access";

export const appRouter = router({ health: healthRouter, projects: projectsRouter, access: accessRouter });
export type AppRouter = typeof appRouter;
