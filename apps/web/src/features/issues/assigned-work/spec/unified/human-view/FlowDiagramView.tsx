import { connectionsLabel, DIAGRAM_NOTE } from "./humanViewCopy";
import { useViewLinks } from "./humanViewNav";
import { SourceLink } from "./OverviewText";
import type { FlowDiagram, FlowNode } from "./viewTypes";

function layersOf(diagram: FlowDiagram) {
  const layers = new Map<number, FlowNode[]>();
  for (const node of diagram.nodes) layers.set(node.depth, [...(layers.get(node.depth) ?? []), node]);
  return [...layers.entries()].sort(([left], [right]) => left - right).map(([, nodes]) => nodes);
}

function targetsOf(diagram: FlowDiagram, node: FlowNode) {
  return diagram.edges.filter((edge) => edge.from === node.id).map((edge) => {
    const label = diagram.nodes.find((candidate) => candidate.id === edge.to)?.label ?? edge.to;
    return edge.label ? `${label} (${edge.label})` : label;
  });
}

function NodeBox({ diagram, node }: { diagram: FlowDiagram; node: FlowNode }) {
  const targets = targetsOf(diagram, node);
  return (
    <li className="min-w-[9rem] flex-1 rounded-md border border-line bg-surface px-3 py-2">
      <p className="text-sm leading-5 font-medium text-ink">{node.label}</p>
      {targets.length > 0 && <p className="mt-1 text-xs leading-5 text-ink-3">{connectionsLabel(targets)}</p>}
    </li>
  );
}

export function FlowDiagramView({ diagram }: { diagram: FlowDiagram }) {
  const links = useViewLinks();
  const layers = layersOf(diagram);
  return (
    <figure className="space-y-3">
      <ol aria-label="Camadas do diagrama" className="space-y-2">
        {layers.map((nodes, index) => (
          <li key={index} className="space-y-2">
            {index > 0 && <span aria-hidden="true" className="block text-center text-ink-3">↓</span>}
            <ul className="flex flex-wrap gap-2">{nodes.map((node) => <NodeBox key={node.id} diagram={diagram} node={node} />)}</ul>
          </li>
        ))}
      </ol>
      <figcaption className="space-y-1"><p className="text-xs text-ink-3">{DIAGRAM_NOTE}</p>{links && <SourceLink source={diagram.source} onOpen={links.openSource} />}</figcaption>
    </figure>
  );
}
