import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth/session";
import { getServerCaller } from "@/lib/trpc/server";
import { resolveHomeDestination } from "@/lib/navigation/resolveHomeDestination";

export default async function HomePage() {
  if (!(await getAuthSession())) redirect("/login");
  let destination = "/projects";
  try {
    const caller = await getServerCaller();
    const me = await caller.access.me();
    const page = await caller.projects.list({});
    destination = resolveHomeDestination(me.lastProjectId, page.items.map((project) => project.id));
  } catch {}
  redirect(destination);
}
