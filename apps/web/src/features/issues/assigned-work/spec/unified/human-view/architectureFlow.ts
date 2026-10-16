import type { Tokens } from "marked";
import type { Chunk } from "./documentChunks";
import type { FlowDiagram, FlowEdge, FlowNode } from "./viewTypes";

const MERMAID = "mermaid";
const FLOWCHART = /^\s*(flowchart|graph)\b/;
const IGNORED_LINE = /^\s*(%%|subgraph\b|end\b|classDef\b|class\b|style\b|click\b|linkStyle\b|direction\b)/;
const ARROW = /\s*(?:-\.->|-->|==>|---)\s*(?:\|([^|]*)\|\s*)?/;
const NODE = /^([\w-]+)\s*(.*)$/;
const SHAPE_EDGES = /^[[({>]+|[\])}]+$/g;
const QUOTES = /^"|"$/g;

type Parsed = { labels: Map<string, string>; edges: FlowEdge[] };

function nodeOf(text: string, labels: Map<string, string>) {
  const match = NODE.exec(text.trim());
  if (!match) return null;
  const label = (match[2] ?? "").trim().replace(SHAPE_EDGES, "").replace(QUOTES, "").trim();
  if (label || !labels.has(match[1]!)) labels.set(match[1]!, label || labels.get(match[1]!) || match[1]!);
  return match[1]!;
}

function parseLine(line: string, parsed: Parsed) {
  const parts = line.split(ARROW);
  let previous = nodeOf(parts[0] ?? "", parsed.labels);
  for (let index = 1; index + 1 < parts.length; index += 2) {
    const next = nodeOf(parts[index + 1] ?? "", parsed.labels);
    if (previous && next) parsed.edges.push({ from: previous, to: next, label: parts[index]?.trim() || null });
    previous = next;
  }
}

function depthsOf(ids: string[], edges: FlowEdge[]) {
  const depth = new Map(ids.map((id) => [id, 0]));
  for (let pass = 0; pass < ids.length; pass += 1) {
    for (const edge of edges) depth.set(edge.to, Math.max(depth.get(edge.to) ?? 0, Math.min((depth.get(edge.from) ?? 0) + 1, ids.length)));
  }
  return depth;
}

export function parseFlowchart(code: string): Pick<FlowDiagram, "nodes" | "edges"> | null {
  const lines = code.split(/\r?\n/);
  if (!FLOWCHART.test(lines[0] ?? "")) return null;
  const parsed: Parsed = { labels: new Map(), edges: [] };
  for (const line of lines.slice(1)) if (line.trim() && !IGNORED_LINE.test(line)) parseLine(line, parsed);
  const ids = [...parsed.labels.keys()];
  const depth = depthsOf(ids, parsed.edges);
  const nodes: FlowNode[] = ids.map((id) => ({ id, label: parsed.labels.get(id)!, depth: depth.get(id) ?? 0 }));
  return nodes.length > 0 ? { nodes, edges: parsed.edges } : null;
}

export function diagramsOf(chunks: Chunk[]): FlowDiagram[] {
  return chunks.flatMap((chunk) => chunk.tokens.filter((token): token is Tokens.Code => token.type === "code" && (token as Tokens.Code).lang === MERMAID)
    .flatMap((token, index) => {
      const parsed = parseFlowchart(token.text);
      return parsed ? [{ id: `${chunk.source.sectionId}:diagram:${index}`, ...parsed, source: chunk.source }] : [];
    }));
}
