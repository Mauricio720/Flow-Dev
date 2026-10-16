import { COVERAGE_HEADERS, SUBTITLES, TEST_KIND_LABELS, TEST_STATUS_NOTE } from "./humanViewCopy";
import { useViewLinks } from "./humanViewNav";
import { InlineText, SourceLink } from "./OverviewText";
import type { CoverageRow, Requirement, TestCase } from "./viewTypes";

type Props = { coverage: CoverageRow[]; testCases: TestCase[]; requirements: Requirement[] };

function Matrix({ coverage }: { coverage: CoverageRow[] }) {
  return (
    <div role="region" aria-label="Matriz de cobertura, com rolagem horizontal" tabIndex={0} className="overflow-x-auto rounded-md border border-line">
      <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
        <thead><tr>{Object.values(COVERAGE_HEADERS).map((header) => <th key={header} scope="col" className="bg-surface px-3 py-2 font-medium text-ink">{header}</th>)}</tr></thead>
        <tbody>
          {coverage.map((row) => (
            <tr key={row.id} className="border-t border-line align-top">
              <td className="px-3 py-2 text-ink-2"><InlineText text={row.origin} /></td>
              <td className="px-3 py-2 leading-6 text-ink-2"><InlineText text={row.behavior} /></td>
              <td className="px-3 py-2 font-mono text-xs leading-6 text-ink">{row.tests.join(", ") || "—"}</td>
              <td className="px-3 py-2 text-xs leading-6 text-ink-2">{row.otherChecks.length > 0 ? <InlineText text={row.otherChecks.join("; ")} /> : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Cases({ testCases }: { testCases: TestCase[] }) {
  const kinds = [...new Set(testCases.map((item) => item.kind))];
  return (
    <details className="group">
      <summary className="cursor-pointer text-sm font-medium text-ink-2 marker:text-ink-3 hover:text-ink">Casos de teste descritos ({testCases.length})</summary>
      <div className="mt-3 space-y-4">{kinds.map((kind) => <div key={kind} className="space-y-1.5"><h6 className="text-xs font-medium text-ink-3">{TEST_KIND_LABELS[kind]}</h6><ul className="space-y-1.5">{testCases.filter((item) => item.kind === kind).map((item) => <li key={item.id} className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-2 text-sm leading-6"><span className="font-mono text-xs leading-6 text-ink-3">{item.id}</span><span className="text-ink-2"><InlineText text={item.title} /></span></li>)}</ul></div>)}</div>
    </details>
  );
}

export function TestMatrix({ coverage, testCases, requirements }: Props) {
  const links = useViewLinks();
  const uncovered = requirements.filter((requirement) => requirement.tests.length === 0);
  return (
    <div className="space-y-4">
      <p className="text-xs leading-5 text-ink-3">{TEST_STATUS_NOTE}</p>
      {coverage.length > 0 && <Matrix coverage={coverage} />}
      {coverage[0] && links && <SourceLink source={coverage[0].source} onOpen={links.openSource} />}
      {uncovered.length > 0 && <p className="text-sm text-ink-2"><span className="font-medium text-ink">{SUBTITLES.uncovered}: </span><span className="font-mono text-xs">{uncovered.map((requirement) => requirement.code).join(", ")}</span></p>}
      {testCases.length > 0 && <Cases testCases={testCases} />}
    </div>
  );
}
