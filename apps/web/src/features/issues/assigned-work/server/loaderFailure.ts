import "server-only";
import { redirect } from "next/navigation";
import { expiredSessionPath } from "@/lib/navigation/projectRoutes";
import { accessProblem, taskFailure } from "@/lib/tasks/taskFailure";

export function failureOf(error: unknown, returnPath: string) {
  const failure = taskFailure(error);
  if (accessProblem(failure) === "session") redirect(expiredSessionPath(returnPath));
  return failure;
}
