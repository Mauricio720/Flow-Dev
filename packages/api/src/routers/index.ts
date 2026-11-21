import { router } from "../trpc";
import { healthRouter } from "./health";
import { projectsRouter } from "./projects";
import { accessRouter } from "./access";
import { tasksRouter } from "./tasks";
import { assignedIssuesRouter } from "./assignedIssues";
import { issueDeletionRouter } from "./issueDeletion";

export const appRouter = router({ health: healthRouter, projects: projectsRouter, access: accessRouter, tasks: tasksRouter, assignedIssues: assignedIssuesRouter, issueDeletion: issueDeletionRouter });
export type AppRouter = typeof appRouter;
