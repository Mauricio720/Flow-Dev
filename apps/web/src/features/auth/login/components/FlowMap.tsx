// The product's flow drawn as a transit map: each lane is a real step or source the agent uses.
const lanes = [
  { id: "trunk-a", d: "M72 300 H216", stroke: "var(--ink)", delay: 0 },
  { id: "future", d: "M216 300 V132", stroke: "var(--ink-3)", delay: 250, dashed: true },
  { id: "project", d: "M216 300 L296 220 H456 L536 300", stroke: "var(--lane-project)", delay: 250 },
  { id: "github", d: "M216 300 L296 380 H456 L536 300", stroke: "var(--lane-github)", delay: 350 },
  { id: "trunk-b", d: "M216 300 H536", stroke: "var(--ink)", delay: 450 },
  { id: "clarify", d: "M352 300 C352 342 400 342 400 300", stroke: "var(--lane-clarify)", delay: 750 },
  { id: "publish", d: "M536 300 V520", stroke: "var(--lane-merge)", delay: 950 },
];

function Stop({ x, y, color }: { x: number; y: number; color: string }) {
  return <circle cx={x} cy={y} r={7} fill="var(--surface)" stroke={color} strokeWidth={3.5} />;
}

export function FlowMap({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="24 96 656 470"
      className={`h-auto w-full max-w-[720px] ${className}`}
      role="img"
      aria-labelledby="flow-map-title flow-map-desc"
    >
      <title id="flow-map-title">Como uma issue nasce no Flow Dev</title>
      <desc id="flow-map-desc">
        Sua intenção vai ao agente Issue Author, que consulta o projeto e o GitHub, pode pedir uma
        clarificação, gera um draft, espera sua aprovação e só então publica a issue.
      </desc>

      {lanes.map((lane) => (
        <path
          key={lane.id}
          d={lane.d}
          pathLength={1}
          fill="none"
          stroke={lane.stroke}
          strokeWidth={lane.dashed ? 2.5 : 7}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={lane.dashed ? "0.02 0.03" : undefined}
          className={lane.dashed ? undefined : "lane-draw"}
          style={{ animationDelay: `${lane.delay}ms` }}
        />
      ))}

      {/* Origin: the developer's intent */}
      <circle cx={72} cy={300} r={13} fill="var(--surface)" stroke="var(--ink)" strokeWidth={5} />
      <text x={72} y={340} textAnchor="middle" className="fill-ink text-[15px] font-medium">Intenção</text>
      <text x={72} y={358} textAnchor="middle" className="fill-ink-3 text-[12px]">você descreve</text>

      {/* Issue Author interchange */}
      <rect x={200} y={284} width={32} height={32} rx={16} fill="var(--ink)" />
      <circle cx={216} cy={300} r={6} fill="var(--surface)" />
      <text x={160} y={258} textAnchor="middle" className="fill-ink text-[15px] font-medium">Issue Author</text>
      <text x={160} y={276} textAnchor="middle" className="fill-ink-3 text-[12px]">agente · Mastra</text>

      <text x={228} y={140} className="fill-ink-3 text-[12px]">outros contextos · em breve</text>

      {/* Project lane */}
      <Stop x={336} y={220} color="var(--lane-project)" />
      <Stop x={416} y={220} color="var(--lane-project)" />
      <text x={296} y={196} className="fill-project-ink text-[13px] font-medium">Projeto</text>
      <text x={336} y={250} textAnchor="middle" className="fill-project-ink font-mono text-[11px]">searchProject</text>
      <text x={416} y={180} textAnchor="middle" className="fill-project-ink font-mono text-[11px]">readProjectFile</text>

      {/* GitHub lane */}
      <Stop x={336} y={380} color="var(--lane-github)" />
      <Stop x={416} y={380} color="var(--lane-github)" />
      <text x={232} y={410} className="fill-github-ink text-[13px] font-medium">GitHub</text>
      <text x={318} y={408} className="fill-github-ink font-mono text-[11px]">searchGitHubIssues</text>
      <text x={416} y={364} textAnchor="middle" className="fill-github-ink font-mono text-[11px]">getGitHubIssue</text>

      {/* Clarification loop */}
      <text x={376} y={288} textAnchor="middle" className="fill-clarify-ink text-[12px] font-medium">clarificação</text>

      {/* Draft merge */}
      <rect x={518} y={282} width={36} height={36} rx={9} fill="var(--surface)" stroke="var(--lane-merge)" strokeWidth={5} />
      <text x={570} y={296} className="fill-ink text-[15px] font-medium">Draft</text>
      <text x={570} y={313} className="fill-ink-3 text-[12px]">editável</text>

      {/* Approval */}
      <Stop x={536} y={420} color="var(--lane-merge)" />
      <text x={554} y={416} className="fill-ink text-[15px] font-medium">Você aprova</text>
      <text x={554} y={433} className="fill-ink-3 text-[12px]">Criar Issue</text>

      {/* Published terminal */}
      <circle cx={536} cy={520} r={17} fill="var(--lane-merge)" />
      <g transform="translate(526 510)" className="text-surface">
        <svg width={20} height={20} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2.02c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.42-2.69 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
        </svg>
      </g>
      <text x={562} y={516} className="fill-ink text-[15px] font-medium">Publicada</text>
      <text x={562} y={533} className="fill-merge-ink font-mono text-[12px]">#148</text>
    </svg>
  );
}

// Phones get the same map re-laid top to bottom, so labels keep a readable size instead of shrinking.
export function FlowMapVertical({ className = "" }: { className?: string }) {
  const X = 172;
  return (
    <svg viewBox="0 0 360 520" className={`h-auto w-full max-w-[400px] ${className}`} role="img" aria-labelledby="flow-map-v-title">
      <title id="flow-map-v-title">
        Como uma issue nasce no Flow Dev: intenção, Issue Author, consultas ao projeto e ao GitHub, clarificação, draft,
        aprovação e publicação.
      </title>
      {[
        { d: `M${X} 30 V110`, stroke: "var(--ink)", delay: 0 },
        { d: `M${X} 110 L120 162 V300 L${X} 352`, stroke: "var(--lane-project)", delay: 200 },
        { d: `M${X} 110 L224 162 V300 L${X} 352`, stroke: "var(--lane-github)", delay: 300 },
        { d: `M${X} 110 V352`, stroke: "var(--ink)", delay: 400 },
        { d: `M${X} 208 C200 208 200 240 ${X} 240`, stroke: "var(--lane-clarify)", delay: 650 },
        { d: `M${X} 352 V486`, stroke: "var(--lane-merge)", delay: 850 },
      ].map((lane) => (
        <path
          key={lane.d}
          d={lane.d}
          pathLength={1}
          fill="none"
          stroke={lane.stroke}
          strokeWidth={6}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="lane-draw"
          style={{ animationDelay: `${lane.delay}ms` }}
        />
      ))}

      <circle cx={X} cy={30} r={11} fill="var(--surface)" stroke="var(--ink)" strokeWidth={4.5} />
      <text x={X + 22} y={27} className="fill-ink text-[14px] font-medium">Intenção</text>
      <text x={X + 22} y={43} className="fill-ink-3 text-[11.5px]">você descreve</text>

      <rect x={X - 14} y={96} width={28} height={28} rx={14} fill="var(--ink)" />
      <circle cx={X} cy={110} r={5} fill="var(--surface)" />
      <text x={X + 24} y={100} className="fill-ink text-[14px] font-medium">Issue Author</text>
      <text x={X + 24} y={116} className="fill-ink-3 text-[11.5px]">agente · Mastra</text>

      <text x={108} y={150} textAnchor="end" className="fill-project-ink text-[13px] font-medium">Projeto</text>
      <Stop x={120} y={200} color="var(--lane-project)" />
      <Stop x={120} y={262} color="var(--lane-project)" />
      <text x={106} y={204} textAnchor="end" className="fill-project-ink font-mono text-[10.5px]">searchProject</text>
      <text x={106} y={266} textAnchor="end" className="fill-project-ink font-mono text-[10.5px]">readProjectFile</text>

      <text x={236} y={150} className="fill-github-ink text-[13px] font-medium">GitHub</text>
      <Stop x={224} y={200} color="var(--lane-github)" />
      <Stop x={224} y={262} color="var(--lane-github)" />
      <text x={238} y={204} className="fill-github-ink font-mono text-[10.5px]">searchGitHubIssues</text>
      <text x={238} y={266} className="fill-github-ink font-mono text-[10.5px]">getGitHubIssue</text>

      <path d={`M${X + 22} 224 H${X + 64}`} stroke="var(--lane-clarify)" strokeWidth={1} strokeDasharray="2 2" />
      <text x={X + 68} y={228} className="fill-clarify-ink text-[11px] font-medium">clarificação</text>

      <rect x={X - 16} y={336} width={32} height={32} rx={8} fill="var(--surface)" stroke="var(--lane-merge)" strokeWidth={4.5} />
      <text x={X + 30} y={356} className="fill-ink text-[14px] font-medium">Draft</text>
      <text x={X + 30} y={372} className="fill-ink-3 text-[11.5px]">editável</text>

      <Stop x={X} y={420} color="var(--lane-merge)" />
      <text x={X + 22} y={417} className="fill-ink text-[14px] font-medium">Você aprova</text>
      <text x={X + 22} y={433} className="fill-ink-3 text-[11.5px]">Criar Issue</text>

      <circle cx={X} cy={486} r={15} fill="var(--lane-merge)" />
      <circle cx={X} cy={486} r={5} fill="var(--surface)" />
      <text x={X + 26} y={483} className="fill-ink text-[14px] font-medium">Publicada</text>
      <text x={X + 26} y={499} className="fill-merge-ink font-mono text-[11.5px]">#148</text>
    </svg>
  );
}
