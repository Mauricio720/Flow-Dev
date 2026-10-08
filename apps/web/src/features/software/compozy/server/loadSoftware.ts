import "server-only";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth/session";
import { PROJECTS_PATH, expiredSessionPath } from "@/lib/navigation/projectRoutes";
import { TRPC_FORBIDDEN, TRPC_UNAUTHORIZED } from "@/lib/projects/contract";
import { getServerCaller } from "@/lib/trpc/server";
import { trpcCode } from "@/lib/trpc/error";
import type { SoftwareInitial } from "../contract";
import { SOFTWARE_COMPOZY_PATH } from "../paths";

export async function loadSoftware(): Promise<SoftwareInitial> {
  if (!(await getAuthSession())) redirect(expiredSessionPath(SOFTWARE_COMPOZY_PATH));
  try {
    const { software } = await getServerCaller();
    const [settings, connections, history] = await Promise.all([software.compozy.get(), software.compozy.connections({}), software.compozy.history({})]);
    return JSON.parse(JSON.stringify({ settings, connections, history })) as SoftwareInitial;
  } catch (error) {
    if (trpcCode(error) === TRPC_UNAUTHORIZED) redirect(expiredSessionPath(SOFTWARE_COMPOZY_PATH));
    if (trpcCode(error) === TRPC_FORBIDDEN) redirect(PROJECTS_PATH);
    throw error;
  }
}
