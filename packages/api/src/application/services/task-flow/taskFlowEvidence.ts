import type { LocalExecutionEvidenceDao } from "../../database/dao/localExecutionEvidenceDao";
import { LocalExecutionError } from "../local-execution/localExecutionErrors";
import { TaskFlowError } from "./taskFlowErrors";

export class TaskFlowEvidence {
  constructor(private readonly dao?: LocalExecutionEvidenceDao) {}

  async gates(input: { taskId: string; runId: string; cursor?: string; limit: number }) {
    let result;
    try { result = await this.dao?.gates(input); }
    catch (error) { if (error instanceof LocalExecutionError && error.reason === "invalid_cursor") throw new TaskFlowError("invalid_cursor"); throw error; }
    if (!result) throw new TaskFlowError("run_unavailable");
    return result;
  }

  async evidence(input: { taskId: string; runId: string; evidenceId: string }) {
    const result = await this.dao?.evidence(input);
    if (!result) throw new TaskFlowError("evidence_unavailable");
    return result;
  }
}
