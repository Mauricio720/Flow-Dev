import { markdownBlocks, markdownSpans, type MarkdownBlock } from "../markdownModel";

const PROSE_CLASS = "max-w-[65ch] text-[15px] leading-relaxed text-ink-2 [overflow-wrap:anywhere] whitespace-pre-wrap";

function Spans({ text }: { text: string }) {
  return (
    <>
      {markdownSpans(text).map((span, index) => {
        if (span.kind === "code") return <code key={index} className="rounded-[4px] bg-ink/[0.06] px-1 py-px font-mono text-[0.86em] text-ink">{span.text}</code>;
        if (span.kind === "link") return <a key={index} href={span.href} target="_blank" rel="noopener noreferrer" className="text-ink underline">{span.text}</a>;
        return <span key={index}>{span.text}</span>;
      })}
    </>
  );
}

function Block({ block }: { block: MarkdownBlock }) {
  if (block.kind === "heading") return <h5 className="pt-1 text-sm font-semibold">{block.text}</h5>;
  if (block.kind === "paragraph") return <p className={PROSE_CLASS}><Spans text={block.text} /></p>;
  return <ul className="list-disc space-y-1 pl-5">{block.items.map((item, index) => <li key={index} className={PROSE_CLASS}><Spans text={item} /></li>)}</ul>;
}

export function MarkdownPreview({ body, label }: { body: string; label: string }) {
  return (
    <div role="group" aria-label={label} className="space-y-2 rounded-md border border-line bg-raised p-3">
      {markdownBlocks(body).map((block, index) => <Block key={index} block={block} />)}
    </div>
  );
}
