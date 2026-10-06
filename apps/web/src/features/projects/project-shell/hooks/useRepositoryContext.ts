"use client";

import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc/client";

type LoadedContext = { projectId: string; defaultBranch: string };

export function useRepositoryContext(projectId: string, enabled: boolean) {
  const [loaded, setLoaded] = useState<LoadedContext | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let current = true;
    trpc.projects.repositoryContext.query({ projectId })
      .then((context) => current && setLoaded({ projectId, defaultBranch: context.defaultBranch }))
      .catch(() => current && setLoaded(null));
    return () => {
      current = false;
    };
  }, [projectId, enabled]);
  return enabled && loaded?.projectId === projectId ? loaded.defaultBranch : null;
}
