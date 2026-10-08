import type { LinkContext } from "@flow-dev/api/spec";
import { SpecInline } from "./SpecInline";

const DIVIDER = /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?$/;

function cells(line: string) {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
}

export function SpecTable({ source, context, label }: { source: string; context: LinkContext; label: string }) {
  const lines = source.split("\n").filter((line) => line.trim());
  const [header = "", divider = "", ...rows] = lines;
  if (!DIVIDER.test(divider.trim())) return <pre className="whitespace-pre-wrap text-sm">{source}</pre>;
  return (
    <div role="region" aria-label={`${label}: tabela com rolagem horizontal`} tabIndex={0} className="overflow-x-auto rounded-md border border-line">
      <table className="min-w-full border-collapse text-left text-sm">
        <thead className="bg-surface"><tr>{cells(header).map((cell, index) => <th key={index} scope="col" className="px-3 py-2 font-medium"><SpecInline text={cell} context={context} /></th>)}</tr></thead>
        <tbody>{rows.map((row, index) => <tr key={index} className="border-t border-line">{cells(row).map((cell, column) => <td key={column} className="px-3 py-2 align-top"><SpecInline text={cell} context={context} /></td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}
