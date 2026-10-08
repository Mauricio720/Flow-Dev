import "server-only";
import { getServerCaller } from "@/lib/trpc/server";
import type { LocalProjectLoad } from "../contract";

export async function loadLocalProject(projectId: string): Promise<LocalProjectLoad> {
  try {
    const link = await (await getServerCaller()).localProjects.mine({ projectId });
    if (!link) return { kind: "none" };
    const readiness = link.readiness === "ready" || link.readiness === "blocked" ? link.readiness : "checking";
    return { kind: "ready", link: { ...link, readiness } };
  } catch {
    return { kind: "unavailable" };
  }
}
