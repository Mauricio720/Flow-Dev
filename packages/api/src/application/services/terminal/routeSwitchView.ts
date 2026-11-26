import type { RouteSwitchRecord } from "../../database/dao/routeSwitchDao";
import type { RouteSwitchState, RouteSwitchView } from "../../terminal/routeSwitch";
import type { TerminalSessionStatus } from "../../terminal/terminalSessionStatus";
import { routeSwitchState } from "../tasks/routeSwitchRules";

function buildView(record: RouteSwitchRecord, state: RouteSwitchState): RouteSwitchView {
  return {
    id: record.id,
    fromRoute: record.fromRoute,
    toRoute: record.toRoute,
    summary: record.summary,
    reasons: record.reasons,
    state,
    decidedBy: record.decidedByName,
    decidedAt: record.decidedAt?.toISOString() ?? null,
    proposedAt: record.proposedAt.toISOString(),
  };
}

export function toRouteSwitchView(record: RouteSwitchRecord, sessionStatus: TerminalSessionStatus): RouteSwitchView {
  return buildView(record, routeSwitchState(record.status, sessionStatus));
}

export function toDecidedRouteSwitchView(record: RouteSwitchRecord): RouteSwitchView {
  return buildView(record, record.status);
}
