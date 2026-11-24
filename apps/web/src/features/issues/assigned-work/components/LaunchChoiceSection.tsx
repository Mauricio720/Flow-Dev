import { plannedChoiceLabel } from "../agentChoiceCopy";
import type { TerminalLaunch } from "../hooks/useTerminalLaunch";
import { AgentChoiceField } from "./AgentChoiceField";
import { SpecChoiceField } from "./SpecChoiceField";

export function LaunchChoiceSection({ launch }: { launch: TerminalLaunch }) {
  const { preflight, purpose, choice } = launch;
  if (!preflight || !choice) return null;
  if (purpose.kind === "route") return <AgentChoiceField agents={preflight.agents} value={choice} onChange={launch.setChoice} disabled={launch.phase === "sending"} />;
  if (purpose.kind === "plan_item") {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium text-ink">{plannedChoiceLabel(choice)}</p>
        {launch.agentProblem ? <p role="alert" className="text-sm text-destructive">{launch.agentProblem}</p> : null}
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <SpecChoiceField specs={purpose.specs} value={launch.specId ?? ""} onChange={launch.setSpecId} />
      <AgentChoiceField agents={preflight.agents} value={choice} onChange={launch.setChoice} disabled={launch.phase === "sending"} />
    </div>
  );
}
