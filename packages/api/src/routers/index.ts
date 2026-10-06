import { router } from "../trpc";
import { healthRouter } from "./health";
import { projectsRouter } from "./projects";
import { accessRouter } from "./access";
import { tasksRouter } from "./tasks";
import { taskSpecRouter } from "./taskSpec";

export const appRouter = router({ health: healthRouter, projects: projectsRouter, access: accessRouter, tasks: tasksRouter, taskSpec: taskSpecRouter });
export type AppRouter = typeof appRouter;
