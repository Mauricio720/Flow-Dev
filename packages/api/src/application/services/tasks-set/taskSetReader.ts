import { parseManifest } from "./taskManifestParser";
import { parseTaskFile } from "./taskFileParser";
import type { ManifestEdge, ManifestNode, TaskSet, TaskSetTask } from "./taskSetTypes";

export type TaskFileSource = { artifactId: string; path: string; content: string };
export type TaskSetSource = {
  folder: string;
  manifest: { artifactId: string; version: number; content: string };
  files: TaskFileSource[];
  otherFolders: string[];
};

const TASK_ID_PREFIX = "task_";

export function joinFolder(folder: string, file: string) {
  return folder === "" ? file : `${folder}/${file}`;
}

function readTask(input: { node: ManifestNode; edges: ManifestEdge[]; source: TaskSetSource }): TaskSetTask {
  const { node, edges, source } = input;
  const path = joinFolder(source.folder, node.file);
  const file = source.files.find((candidate) => candidate.path === path);
  const parsed = file ? parseTaskFile(file.content) : { title: null, type: null, complexity: null, status: "unknown" as const, miniDone: 0, miniTotal: 0 };
  const dependsOn = edges.filter((edge) => edge.to === node.id).map((edge) => edge.from).sort();
  return { ...parsed, id: node.id, number: node.id.slice(TASK_ID_PREFIX.length), dependsOn, artifactId: file?.artifactId ?? null, path: file ? path : null };
}

export function readTaskSet(source: TaskSetSource): TaskSet {
  const base = { folder: source.folder, manifestArtifactId: source.manifest.artifactId, manifestVersion: source.manifest.version, otherFolders: source.otherFolders };
  const manifest = parseManifest(source.manifest.content);
  if (manifest.problem !== null) return { ...base, problem: manifest.problem, tasks: [] };
  const tasks = manifest.nodes.map((node) => readTask({ node, edges: manifest.edges, source }));
  return { ...base, problem: null, tasks };
}
