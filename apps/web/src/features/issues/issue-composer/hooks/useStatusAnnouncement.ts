"use client";

import { useState } from "react";
import type { TaskStatus } from "../contract";
import { STATUS_ANNOUNCEMENT } from "../taskCopy";

const SILENT = "";

function announce(status: TaskStatus | null) {
  return status ? STATUS_ANNOUNCEMENT[status] : SILENT;
}

export function useStatusAnnouncement(scope: string, status: TaskStatus | null) {
  const [seen, setSeen] = useState({ scope, status, message: SILENT });
  if (seen.scope !== scope) setSeen({ scope, status, message: SILENT });
  else if (seen.status !== status) setSeen({ scope, status, message: announce(status) });
  return seen.scope === scope ? seen.message : SILENT;
}
