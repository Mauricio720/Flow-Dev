import type { ExecutionRecord } from "../../application/database/dao/taskExecutionDao";
import type { SyncOutcome } from "../../application/services/execution/executionSyncService";
import type { StartBlocker } from "../../application/services/execution/executionStartRules";

type StatusRecord = { canStart: boolean; startBlockedBy: StartBlocker | null; current: SyncOutcome | null; history: ExecutionRecord[] };
type Review = { outcome: string; summary: string | null };
type Block = { kind: string; reason: string };

export function executionStatusDto(record: StatusRecord) {
  return {
    canStart: record.canStart,
    startBlockedBy: record.startBlockedBy,
    current: record.current ? currentDto(record.current.execution, record.current.reachable) : null,
    history: record.history.map(historyDto),
  };
}

function currentDto(execution: ExecutionRecord, reachable: boolean) {
  const detail = execution.detail;
  return {
    executionId: execution.id,
    route: execution.route,
    state: execution.state,
    attempt: execution.attempt,
    branch: execution.branch,
    agent: textOrNull(detail.agent),
    runAttempt: typeof detail.runAttempt === "number" ? detail.runAttempt : null,
    review: (detail.review as Review | null | undefined) ?? null,
    blocks: (detail.blocks as Block[] | undefined) ?? [],
    attention: textOrNull(detail.attention),
    failureCode: execution.failureCode,
    failureDetail: textOrNull(detail.failureDetail),
    specRound: execution.specRound,
    pullRequestUrl: execution.pullRequestUrl,
    compozyTaskIdentifiers: typeof detail.workIdentifier === "string" ? [detail.workIdentifier] : [],
    lastSyncedAt: execution.lastSyncedAt?.toISOString() ?? null,
    compozyReachable: reachable,
  };
}

function historyDto(execution: ExecutionRecord) {
  return { executionId: execution.id, state: execution.state, attempt: execution.attempt, finishedAt: execution.finishedAt?.toISOString() ?? null };
}

function textOrNull(value: unknown) {
  return typeof value === "string" ? value : null;
}
