"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { expiredSessionPath, projectPath } from "@/lib/navigation/projectRoutes";
import { resolveHomeDestination } from "@/lib/navigation/resolveHomeDestination";
import { TRPC_NOT_FOUND, TRPC_UNAUTHORIZED } from "@/lib/projects/contract";
import { trpc } from "@/lib/trpc/client";
import { trpcCode } from "@/lib/trpc/error";

export type SelectionFailure = "unavailable" | "interrupted";

export function useProjectSelection(onUnavailable: () => void, isAdmin: boolean) {
  const router = useRouter();
  const latest = useRef(0);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [failure, setFailure] = useState<SelectionFailure | null>(null);
  function fail(error: unknown, projectId: string) {
    setPendingId(null);
    const code = trpcCode(error);
    if (code === TRPC_UNAUTHORIZED) return router.replace(expiredSessionPath(projectPath(projectId)));
    if (code !== TRPC_NOT_FOUND) return setFailure("interrupted");
    setFailure("unavailable");
    onUnavailable();
  }
  async function choose(projectId: string) {
    const attempt = ++latest.current;
    setPendingId(projectId);
    setFailure(null);
    try {
      await trpc.projects.select.mutate({ projectId });
      if (attempt === latest.current) router.push(resolveHomeDestination(projectId, [projectId], { isAdmin }));
    } catch (error) {
      if (attempt === latest.current) fail(error, projectId);
    }
  }
  return { pendingId, failure, choose };
}

export type ProjectSelection = ReturnType<typeof useProjectSelection>;
