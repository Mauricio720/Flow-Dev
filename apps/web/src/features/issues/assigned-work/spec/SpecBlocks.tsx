import { diagramDiagnostic, type LinkContext, type ReviewBlock } from "@flow-dev/api/spec";
import { SpecDiagram } from "./SpecDiagram";
import { SpecInline } from "./SpecInline";
import { SpecTable } from "./SpecTable";
import { stripHeading } from "./specSource";

type Props = { blocks: ReviewBlock[]; context: LinkContext; onOpenDocument?: (documentId: string) => void };

function Heading({ block }: { block: ReviewBlock }) {
  const level = Math.min(6, Math.max(2, (block.level ?? 2) + 1));
  const Tag = `h${level}` as "h2";
  return <Tag id={block.id} className="text-[15px] font-semibold text-ink">{stripHeading(block.content)}</Tag>;
}

export function SpecBlock({ block, context, onOpenDocument }: { block: ReviewBlock } & Omit<Props, "blocks">) {
  if (block.kind === "heading") return <Heading block={block} />;
  if (block.kind === "table") return <SpecTable source={block.content} context={context} label={`Bloco ${block.id}`} />;
  if (block.kind === "code") return <pre tabIndex={0} className="overflow-x-auto rounded-md border border-line bg-surface p-3 text-sm"><code>{block.content}</code></pre>;
  if (block.kind === "diagram") return <SpecDiagram source={block.content.replace(/^```mermaid\n?/, "").replace(/\n?```$/, "")} blocked={diagramDiagnostic(block) !== null} />;
  return <p id={block.id} className="max-w-[72ch] whitespace-pre-wrap text-[15px] leading-relaxed text-ink-2"><SpecInline text={block.content} context={context} onOpenDocument={onOpenDocument} /></p>;
}

export function SpecBlocks({ blocks, context, onOpenDocument }: Props) {
  return <div className="space-y-3">{blocks.map((block) => <SpecBlock key={block.id} block={block} context={context} onOpenDocument={onOpenDocument} />)}</div>;
}
