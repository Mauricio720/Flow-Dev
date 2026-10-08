import { router } from "../trpc";
import { healthRouter } from "./health";
import { projectsRouter } from "./projects";
import { accessRouter } from "./access";
import { tasksRouter } from "./tasks";
import { taskSpecRouter } from "./taskSpec";
import { softwareRouter } from "./software";
import { taskFlowRouter } from "./taskFlow";
import { assignedIssuesRouter } from "./assignedIssues";
import { localMachinesRouter } from "./localMachines";
import { localProjectsRouter } from "./localProjects";

export const appRouter = router({ health: healthRouter, projects: projectsRouter, access: accessRouter, tasks: tasksRouter, taskSpec: taskSpecRouter, software: softwareRouter, taskFlow: taskFlowRouter, assignedIssues: assignedIssuesRouter, localMachines: localMachinesRouter, localProjects: localProjectsRouter });
export type AppRouter = typeof appRouter;
