import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getAuthSession } from "@/lib/auth/session";
import { expiredSessionPath } from "@/lib/navigation/projectRoutes";
import { TRPC_BAD_REQUEST, TRPC_NOT_FOUND, TRPC_UNAUTHORIZED, type Project } from "@/lib/projects/contract";
import { trpcCode } from "@/lib/trpc/error";
import { getServerCaller } from "@/lib/trpc/server";

export type ProjectContextLoad = { kind: "ready"; project: Project } | { kind: "unavailable" };

const UNAVAILABLE_CODES: unknown[] = [TRPC_NOT_FOUND, TRPC_BAD_REQUEST];

export const loadProjectContext = cache(async (projectId: string, returnPath: string): Promise<ProjectContextLoad> => {
  if (!(await getAuthSession())) redirect(expiredSessionPath(returnPath));
  const caller = await getServerCaller();
  try {
    return { kind: "ready", project: await caller.projects.byId({ projectId }) };
  } catch (error) {
    const code = trpcCode(error);
    if (code === TRPC_UNAUTHORIZED) redirect(expiredSessionPath(returnPath));
    if (UNAVAILABLE_CODES.includes(code)) return { kind: "unavailable" };
    throw error;
  }
});
