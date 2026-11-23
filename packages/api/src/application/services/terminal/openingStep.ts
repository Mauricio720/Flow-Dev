import type { ClaimInput, SessionControlDao } from "../../terminal/sessionInteractionPorts";
import type { SessionLog } from "./sessionLog";
import type { SessionStarter } from "./sessionStarter";
import type { TickStep } from "./sessionTickStep";

export type OpeningDeps = { control: Pick<SessionControlDao, "claimOpening">; starter: SessionStarter; identity: ClaimInput; log: SessionLog };

export class OpeningStep implements TickStep {
  readonly name = "opening";

  constructor(private readonly deps: OpeningDeps) {}

  async run() {
    for (let claimed = await this.deps.control.claimOpening(this.deps.identity); claimed; claimed = await this.deps.control.claimOpening(this.deps.identity)) {
      this.deps.log.info("claimed", { sessionId: claimed.id, taskId: claimed.taskId });
      await this.deps.starter.start(claimed);
    }
  }
}
