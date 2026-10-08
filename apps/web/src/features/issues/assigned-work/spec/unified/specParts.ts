export type SpecPart = { id: "product" | "technical" | "document"; title: string; text: string };

const PART_HEADING = /^(#{1,3})\s+(.*)$/gm;

function partIdOf(title: string): SpecPart["id"] | null {
  if (/\bproduct\b/i.test(title)) return "product";
  if (/\btechnical\b/i.test(title)) return "technical";
  return null;
}

function partHeadings(source: string) {
  const matches = [...source.matchAll(PART_HEADING)].map((match) => ({ index: match.index ?? 0, depth: (match[1] ?? "").length, title: match[2] ?? "", id: partIdOf(match[2] ?? "") })).filter((heading) => heading.id);
  const shallowest = Math.min(...matches.map((heading) => heading.depth));
  return matches.filter((heading, position) => heading.depth === shallowest && matches.findIndex((other) => other.depth === shallowest && other.id === heading.id) === position);
}

export function splitSpecParts(source: string): SpecPart[] {
  const headings = partHeadings(source);
  if (headings.length === 0) return [{ id: "document", title: "Documento", text: source }];
  return headings.map((heading, position) => {
    const end = headings[position + 1]?.index ?? source.length;
    return { id: heading.id!, title: heading.title.trim(), text: source.slice(heading.index, end).trim() };
  });
}
