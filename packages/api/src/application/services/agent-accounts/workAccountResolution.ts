import type { AgentAccountProvider } from "../../agent-accounts/agentAccountTypes";
import { TaskError } from "../tasks/taskErrors";
import { WorkAccountError, type WorkAccountService } from "./workAccountService";

export class WorkAccountResolution {
  constructor(private readonly accounts: Pick<WorkAccountService, "resolve">) {}

  async resolve(input: { taskId: string; agent: AgentAccountProvider; actorId: string }) {
    try { return await this.accounts.resolve(input); }
    catch (error) {
      if (!(error instanceof WorkAccountError)) throw error;
      if (error.reason === "account_removed") throw new TaskError("account_removed", { message: error.message }, error);
      if (error.reason === "account_not_owned") throw new TaskError("account_not_owned", { message: error.message }, error);
      throw error;
    }
  }
}
