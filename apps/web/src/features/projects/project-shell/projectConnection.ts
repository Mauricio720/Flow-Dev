"use client";

import { createContext, useContext } from "react";
import type { ConnectionKind } from "@/lib/projects/contract";

export type ProjectConnection = { kind: ConnectionKind; recheck: () => void };

const UNCHECKED_CONNECTION: ProjectConnection = { kind: "checking", recheck: () => undefined };

export const ProjectConnectionContext = createContext<ProjectConnection>(UNCHECKED_CONNECTION);

export function useProjectConnection() {
  return useContext(ProjectConnectionContext);
}
