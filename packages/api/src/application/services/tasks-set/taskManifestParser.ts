import { readFrontmatter } from "./frontmatter";
import { findGraphProblem } from "./manifestGraph";
import { FRONTMATTER_PROBLEM, GRAPH_MISSING_PROBLEM, MAX_TASKS, TOO_MANY_TASKS_PROBLEM } from "./manifestProblems";
import type { ManifestEdge, ManifestNode } from "./taskSetTypes";

export const MANIFEST_SCHEMA_VERSION = "compozy.tasks/v2";
const TASK_ID_PATTERN = /^task_\d{2}$/;

export type ManifestParse = { nodes: ManifestNode[]; edges: ManifestEdge[]; problem: null } | { problem: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toNode(value: unknown): ManifestNode | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.file !== "string") return null;
  return TASK_ID_PATTERN.test(value.id) && value.file === `${value.id}.md` ? { id: value.id, file: value.file } : null;
}

function toEdge(value: unknown): ManifestEdge | null {
  if (!isRecord(value) || typeof value.from !== "string" || typeof value.to !== "string") return null;
  return { from: value.from, to: value.to };
}

function collect<T>(values: unknown, convert: (value: unknown) => T | null): T[] | null {
  if (values === undefined || values === null) return [];
  if (!Array.isArray(values)) return null;
  const converted = values.map(convert);
  return converted.every((item): item is T => item !== null) ? converted : null;
}

export function parseManifest(content: string): ManifestParse {
  const frontmatter = readFrontmatter(content);
  if (frontmatter?.data.schema_version !== MANIFEST_SCHEMA_VERSION) return { problem: FRONTMATTER_PROBLEM };
  const graph = frontmatter.data.graph;
  if (graph === undefined || graph === null) return { problem: GRAPH_MISSING_PROBLEM };
  const nodes = isRecord(graph) ? collect(graph.nodes, toNode) : null;
  const edges = isRecord(graph) ? collect(graph.edges, toEdge) : null;
  if (!nodes || !edges) return { problem: FRONTMATTER_PROBLEM };
  if (nodes.length === 0) return { problem: GRAPH_MISSING_PROBLEM };
  if (nodes.length > MAX_TASKS) return { problem: TOO_MANY_TASKS_PROBLEM };
  const problem = findGraphProblem({ nodes, edges });
  return problem ? { problem } : { nodes, edges, problem: null };
}
