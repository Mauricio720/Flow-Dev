import { plannedChoiceLabel } from "../agentChoiceCopy";
import type { TerminalLaunch } from "../hooks/useTerminalLaunch";
import { AgentChoiceField } from "./AgentChoiceField";
import { SessionAccountLabel } from "./SessionAccountLabel";
import { SpecChoiceField } from "./SpecChoiceField";

type Props = { launch: TerminalLaunch; onLeave: () => void };

function PurposeChoice({ launch }: { launch: TerminalLaunch }) {
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

export function LaunchChoiceSection({ launch, onLeave }: Props) {
  if (!launch.preflight || !launch.choice) return null;
  return (
    <div className="space-y-3">
      <PurposeChoice launch={launch} />
      <SessionAccountLabel agent={launch.choice.agent} onBeforeJump={onLeave} />
    </div>
  );
}
