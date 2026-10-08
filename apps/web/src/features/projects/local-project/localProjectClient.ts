import type { LocalProjectActions } from "./contract";
import { trpc } from "@/lib/trpc/client";
import { trpcData } from "@/lib/trpc/error";

const UNAVAILABLE_REASON = "local_projects_unavailable";

function reasonOf(error: unknown) {
  const data = trpcData(error);
  return data && "reason" in data && typeof data.reason === "string" ? data.reason : UNAVAILABLE_REASON;
}

export const localProjectActions: LocalProjectActions = {
  mine: async (projectId) => {
    const link = await trpc.localProjects.mine.query({ projectId });
    if (!link) return { kind: "none" };
    const readiness = link.readiness === "ready" || link.readiness === "blocked" ? link.readiness : "checking";
    return { kind: "ready", link: { ...link, readiness } };
  },
  unlink: async (input) => {
    try {
      const result = await trpc.localProjects.unlink.mutate(input);
      return { status: "unlinked", revision: result.revision };
    } catch (error) {
      return { status: "rejected", reason: reasonOf(error) };
    }
  },
  requestFolder: async (projectId) => {
    try {
      await trpc.localProjects.requestLink.mutate({ projectId });
      return { status: "opened" };
    } catch (error) {
      return { status: "rejected", reason: reasonOf(error) };
    }
  },
  folderRequest: async (projectId) => {
    const request = await trpc.localProjects.linkRequest.query({ projectId });
    return request ? { state: request.state, reason: request.reason } : null;
  },
};
