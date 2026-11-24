import { CYCLE_PROBLEM, duplicatedTaskProblem, unknownTaskProblem } from "./manifestProblems";
import type { ManifestEdge, ManifestNode } from "./taskSetTypes";

export type ManifestGraph = { nodes: ManifestNode[]; edges: ManifestEdge[] };

function findDuplicate(nodes: ManifestNode[]) {
  const seen = new Set<string>();
  return nodes.find((node) => (seen.has(node.id) ? true : (seen.add(node.id), false)));
}

function hasCycle({ nodes, edges }: ManifestGraph) {
  const remaining = new Map(nodes.map((node) => [node.id, edges.filter((edge) => edge.to === node.id).length]));
  const ready = [...remaining].filter(([, count]) => count === 0).map(([id]) => id);
  let visited = 0;
  for (let id = ready.pop(); id !== undefined; id = ready.pop()) {
    visited += 1;
    for (const edge of edges.filter((candidate) => candidate.from === id)) {
      const left = (remaining.get(edge.to) ?? 0) - 1;
      remaining.set(edge.to, left);
      if (left === 0) ready.push(edge.to);
    }
  }
  return visited < nodes.length;
}

export function findGraphProblem(graph: ManifestGraph): string | null {
  const duplicate = findDuplicate(graph.nodes);
  if (duplicate) return duplicatedTaskProblem(duplicate.id);
  const known = new Set(graph.nodes.map((node) => node.id));
  const orphan = graph.edges.find((edge) => !known.has(edge.from) || !known.has(edge.to));
  if (orphan) return unknownTaskProblem(orphan);
  return hasCycle(graph) ? CYCLE_PROBLEM : null;
}
