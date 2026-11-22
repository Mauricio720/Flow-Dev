import type { RecordedContextCall } from "../../application/database/dao/issueContextDao";
import { ISSUE_SOURCE_ID, type ModelAssessment } from "./planningOutputSchema";

export function allowedSourceIds(calls: RecordedContextCall[]) {
  const ids = new Set<string>([ISSUE_SOURCE_ID]);
  for (const call of calls) if (call.status === "done") for (const id of call.evidenceIds) ids.add(id);
  return ids;
}

export function citesOnlyRetrievedSources(assessment: ModelAssessment, calls: RecordedContextCall[]) {
  const allowed = allowedSourceIds(calls);
  return assessment.reasons.every((reason) => reason.sourceIds.every((id) => allowed.has(id)));
}
