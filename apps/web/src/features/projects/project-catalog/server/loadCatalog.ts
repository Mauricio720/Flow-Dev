import "server-only";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth/session";
import { loadViewer } from "@/lib/auth/viewer";
import { PROJECTS_PATH, expiredSessionPath } from "@/lib/navigation/projectRoutes";
import { TRPC_UNAUTHORIZED } from "@/lib/projects/contract";
import { trpcCode } from "@/lib/trpc/error";
import { getServerCaller } from "@/lib/trpc/server";
import type { CatalogLoad, CatalogViewer } from "../catalogState";

type Caller = Awaited<ReturnType<typeof getServerCaller>>;

function requireSession(error: unknown) {
  if (trpcCode(error) === TRPC_UNAUTHORIZED) redirect(expiredSessionPath(PROJECTS_PATH));
}

async function requireViewer(): Promise<CatalogViewer> {
  try {
    return await loadViewer();
  } catch (error) {
    requireSession(error);
    throw error;
  }
}

async function loadFirstPage(caller: Caller): Promise<CatalogLoad> {
  try {
    return { kind: "ready", page: await caller.projects.list({}) };
  } catch (error) {
    requireSession(error);
    return { kind: "failed" };
  }
}

export async function loadCatalog() {
  if (!(await getAuthSession())) redirect(expiredSessionPath(PROJECTS_PATH));
  const caller = await getServerCaller();
  const viewer = await requireViewer();
  return { viewer, initial: await loadFirstPage(caller) };
}
