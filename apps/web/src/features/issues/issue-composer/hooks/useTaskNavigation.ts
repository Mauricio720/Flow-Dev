"use client";

import { useEffect, useState } from "react";
import { projectIssuesPath, projectTaskPath, taskIdFromPath } from "@/lib/navigation/projectRoutes";

export function useTaskNavigation(projectId: string, initialTaskId: string | null) {
  const [taskId, setTaskId] = useState(initialTaskId);
  useEffect(() => {
    const followHistory = () => setTaskId(taskIdFromPath(projectId, window.location.pathname));
    window.addEventListener("popstate", followHistory);
    return () => window.removeEventListener("popstate", followHistory);
  }, [projectId]);
  function select(next: string | null) {
    if (next === taskId) return;
    setTaskId(next);
    window.history.pushState(null, "", next ? projectTaskPath(projectId, next) : projectIssuesPath(projectId));
  }
  return { taskId, select };
}
