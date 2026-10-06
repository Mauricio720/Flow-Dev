import { redirect } from "next/navigation";
import { AccessManagement } from "@/features/access/access-management";
import { getAuthSession } from "@/lib/auth/session";
import { getServerCaller } from "@/lib/trpc/server";
import { trpcCode } from "@/lib/trpc/error";

export default async function AccessPage() {
  if (!(await getAuthSession())) redirect("/login?erro=sessao_expirada");
  let users;
  let projects;
  try {
    const caller = await getServerCaller();
    const me = await caller.access.me();
    if (!me.isAdmin) redirect("/projects");
    users = await caller.access.users({});
    projects = await getAllProjects(caller);
  } catch (error) {
    if (["UNAUTHORIZED", "FORBIDDEN", "NOT_FOUND"].includes(String(trpcCode(error)))) redirect("/projects");
    throw error;
  }
  return <AccessManagement initialPage={users} initialProjects={projects} />;
}

async function getAllProjects(caller: Awaited<ReturnType<typeof getServerCaller>>) {
  const items = [];
  let cursor: string | undefined;
  do {
    const page = await caller.projects.list({ cursor });
    items.push(...page.items);
    const next = page.nextCursor ?? undefined;
    if (next === cursor) break;
    cursor = next;
  } while (cursor);
  return items;
}
