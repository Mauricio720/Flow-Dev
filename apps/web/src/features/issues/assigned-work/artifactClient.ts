import { trpc } from "@/lib/trpc/client";
import type { TerminalScope } from "./terminalContract";

export type ArtifactContentQuery = { artifactId: string; version?: number };

export function fetchArtifactVersions(scope: TerminalScope) {
  return trpc.tasks.artifacts.list.query(scope);
}

export function fetchArtifactContent(scope: TerminalScope, query: ArtifactContentQuery) {
  return trpc.tasks.artifacts.get.query({ ...scope, ...query });
}
