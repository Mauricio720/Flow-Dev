import "server-only";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth/session";
import { loadViewer } from "@/lib/auth/viewer";
import { PROJECTS_PATH, expiredSessionPath } from "@/lib/navigation/projectRoutes";
import { TRPC_UNAUTHORIZED } from "@/lib/projects/contract";
import { trpcCode } from "@/lib/trpc/error";

async function isAdministrator(returnPath: string) {
  try {
    return (await loadViewer()).isAdmin;
  } catch (error) {
    if (trpcCode(error) === TRPC_UNAUTHORIZED) redirect(expiredSessionPath(returnPath));
    throw error;
  }
}

export async function requireAdministrator(returnPath: string) {
  if (!(await getAuthSession())) redirect(expiredSessionPath(returnPath));
  if (!(await isAdministrator(returnPath))) redirect(PROJECTS_PATH);
}
