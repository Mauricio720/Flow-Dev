import type { AuditRecord, ConnectionRecord } from "../application/database/dao/softwareDao";
import type { ConnectionReadiness } from "../application/services/software/connectionReadiness";
import type { ReadinessProjection } from "../application/software/readiness";

export function toConnectionDto(input: { connection: ConnectionRecord; readiness: ConnectionReadiness; activeRuns: number }) {
  const { connection, readiness, activeRuns } = input;
  return {
    id: connection.id,
    label: connection.label,
    providerKind: connection.providerKind,
    authState: connection.authState,
    accountLabel: connection.accountLabel,
    revision: connection.revision,
    lastCheckedAt: connection.lastCheckedAt,
    disabled: connection.disabledAt !== null,
    readiness,
    activeRuns,
  };
}

export function toReadinessDto(projection: ReadinessProjection) {
  return { layers: Object.values(projection.layers), checkedAt: projection.checkedAt, stale: projection.stale };
}

export function toAuditDto(record: AuditRecord) {
  return { id: record.id, actorName: record.actorName, event: record.event, summary: record.diff, createdAt: record.createdAt };
}
