"use client";

import { useState } from "react";
import type { PlanningDetail, TaskStatus } from "../contract";
import { PLANNING_ANNOUNCEMENT } from "../planningCopy";
import { STATUS_ANNOUNCEMENT } from "../taskCopy";

const SILENT = "";
type Observed = { status: TaskStatus | null; planning: PlanningDetail["status"] | null };

function announce(observed: Observed) {
  if (!observed.status) return SILENT;
  const planning = observed.status === "published" && observed.planning ? PLANNING_ANNOUNCEMENT[observed.planning as keyof typeof PLANNING_ANNOUNCEMENT] : undefined;
  return planning ?? STATUS_ANNOUNCEMENT[observed.status];
}

export function useStatusAnnouncement(scope: string, status: TaskStatus | null, planning: PlanningDetail["status"] | null = null) {
  const [seen, setSeen] = useState({ scope, status, planning, message: SILENT });
  if (seen.scope !== scope) setSeen({ scope, status, planning, message: SILENT });
  else if (seen.status !== status || seen.planning !== planning) setSeen({ scope, status, planning, message: announce({ status, planning }) });
  return seen.scope === scope ? seen.message : SILENT;
}
