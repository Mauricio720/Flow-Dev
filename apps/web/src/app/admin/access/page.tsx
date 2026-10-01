import { redirect } from "next/navigation";
import { AccessManagement } from "@/features/access/access-management";
import { getAuthSession } from "@/lib/auth/session";
import { getServerCaller } from "@/lib/trpc/server";

export default async function AccessPage() {
  if (!(await getAuthSession())) redirect("/login?erro=sessao_expirada");
  let users;
  try { const caller = await getServerCaller(); const me = await caller.access.me(); if (!me.isAdmin) redirect("/projects"); users = await caller.access.users({}); } catch { redirect("/projects"); }
  return <AccessManagement initialUsers={users.items} />;
}
