import { FlowMark } from "@/components/icons";
import { OverviewPanel } from "./OverviewPanel";

const AGENT_SOURCES = [
  { lane: "Projeto", dot: "bg-project", ink: "text-project-ink", tools: ["searchProject", "readProjectFile"] },
  { lane: "GitHub", dot: "bg-github", ink: "text-github-ink", tools: ["searchGitHubIssues", "getGitHubIssue"] },
];

export function IssueAuthorPanel() {
  return (
    <OverviewPanel id="agent-title" title="Agente">
      <div className="p-5">
        <div className="flex items-start gap-3">
          <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-ground ring-1 ring-line"><FlowMark /></span>
          <div className="min-w-0">
            <p className="text-[15px] font-semibold">Issue Author</p>
            <p className="mt-1 text-sm leading-6 text-ink-2">Lê o código e as issues do repositório, pergunta quando falta informação e escreve o draft. Nada vai ao GitHub sem a sua aprovação.</p>
          </div>
        </div>
        <h3 className="mt-5 text-xs text-ink-3">Fontes que consulta</h3>
        <ul className="mt-1 divide-y divide-line">
          {AGENT_SOURCES.map((source) => (
            <li key={source.lane} className="flex items-start gap-3 py-2.5">
              <span aria-hidden="true" className={`mt-1.5 size-2 shrink-0 rounded-full ${source.dot}`} />
              <div className="min-w-0">
                <p className={`text-sm font-medium ${source.ink}`}>{source.lane}</p>
                <p className="mt-0.5 font-mono text-xs text-ink-2 [overflow-wrap:anywhere]">{source.tools.join(" · ")}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </OverviewPanel>
  );
}
