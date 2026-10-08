export type LocalGateDto = { gateId: string; attempt: number; required: boolean; state: string; reason: string | null; manifestHash: string; checkedCheckoutDigest: string; exitCode: number | null; startedAt: string | null; finishedAt: string | null };
export type LocalEvidenceDto = { id: string; kind: string; safeContentHash: string; label: string; content: string };

export interface LocalExecutionEvidenceDao {
  gates(input: { taskId: string; runId: string; cursor?: string; limit: number }): Promise<{ items: LocalGateDto[]; summary: string; nextCursor: string | null } | null>;
  evidence(input: { taskId: string; runId: string; evidenceId: string }): Promise<LocalEvidenceDto | null>;
}
