import { and, eq } from "drizzle-orm";
import { parseManifest } from "../../../../application/services/tasks-set/taskManifestParser";
import type { SavedGraph } from "../../../../application/services/tasks-set/planTypes";
import type { Database } from "../../client";
import { taskArtifactVersions, taskArtifacts } from "../../schema";

const MANIFEST_NAME = "_tasks.md";

type Lookup = { taskId: string; folder: string; version: number };

export async function savedManifestGraph(database: Database, lookup: Lookup): Promise<SavedGraph | null> {
  const path = lookup.folder === "" ? MANIFEST_NAME : `${lookup.folder}/${MANIFEST_NAME}`;
  const [row] = await database
    .select({ content: taskArtifactVersions.content })
    .from(taskArtifacts)
    .innerJoin(taskArtifactVersions, eq(taskArtifactVersions.artifactId, taskArtifacts.id))
    .where(and(eq(taskArtifacts.taskId, lookup.taskId), eq(taskArtifacts.relativePath, path), eq(taskArtifactVersions.version, lookup.version)))
    .limit(1);
  if (!row) return null;
  const manifest = parseManifest(row.content);
  return manifest.problem === null ? { nodes: manifest.nodes.map((node) => node.id), edges: manifest.edges } : null;
}
