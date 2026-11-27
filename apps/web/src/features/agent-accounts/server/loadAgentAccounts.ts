import "server-only";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth/session";
import { AI_ACCOUNTS_PATH } from "@/lib/navigation/accountRoutes";
import { expiredSessionPath } from "@/lib/navigation/projectRoutes";
import { TRPC_UNAUTHORIZED } from "@/lib/projects/contract";
import { trpcCode } from "@/lib/trpc/error";
import { getServerCaller } from "@/lib/trpc/server";

export async function loadAgentAccounts() {
  if (!(await getAuthSession())) redirect(expiredSessionPath(AI_ACCOUNTS_PATH));
  try {
    return await (await getServerCaller()).agentAccounts.list();
  } catch (error) {
    if (trpcCode(error) === TRPC_UNAUTHORIZED) redirect(expiredSessionPath(AI_ACCOUNTS_PATH));
    throw error;
  }
}
