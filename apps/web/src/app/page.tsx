import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth/session";
import { PROJECTS_PATH, REVOKED_ACCESS_PATH } from "@/lib/navigation/projectRoutes";
import { resolveHomeDestination } from "@/lib/navigation/resolveHomeDestination";
import { TRPC_NOT_FOUND } from "@/lib/projects/contract";
import { trpcCode } from "@/lib/trpc/error";
import { getServerCaller } from "@/lib/trpc/server";

const LOGIN_PATH = "/login";

async function restoredDestination() {
  const caller = await getServerCaller();
  const me = await caller.access.me();
  if (!me.lastProjectId) return PROJECTS_PATH;
  try {
    const project = await caller.projects.byId({ projectId: me.lastProjectId });
    return resolveHomeDestination(me.lastProjectId, [project.id]);
  } catch (error) {
    if (trpcCode(error) === TRPC_NOT_FOUND) return REVOKED_ACCESS_PATH;
    throw error;
  }
}

export default async function HomePage() {
  if (!(await getAuthSession())) redirect(LOGIN_PATH);
  redirect(await restoredDestination());
}
