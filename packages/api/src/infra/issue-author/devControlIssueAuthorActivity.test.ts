import { describe, expect, it, vi } from "vitest";
import type { GenerationInput } from "../../application/issue-author/issueAuthorGateway";
import { DevControlIssueAuthorGateway } from "./devControlIssueAuthorGateway";

const input: GenerationInput = { protocolVersion: 1, operationId: "op-1", executionId: "exec-1", messages: [{ role: "user", content: "TEST-05" }], currentDraft: null, baseRevisionId: null, retainedEvidence: [], contextCapability: "opaque" };
const CONTEXT_BUDGET = 12;
const RECORDED_ACTIVITY_COUNT = 19;
const result = { status: "draft_ready", draft: { title: "TEST-05", context: "Isolamento entre proprietários", objective: "Provar acesso próprio e negar acesso alheio", constraints: [], relevantContext: [], productConsiderations: [], references: [] } };

function recordedActivity(count: number) {
  return Array.from({ length: count }, (_, index) => ({ toolCallId: `call-${index}`, status: index < CONTEXT_BUDGET ? "done" : "unavailable", evidenceIds: [], durationMs: 0, ...(index < CONTEXT_BUDGET ? {} : { reason: "context_limit" }) }));
}

describe("Issue Author recorded activity", () => {
  it.each([CONTEXT_BUDGET, CONTEXT_BUDGET + 1, RECORDED_ACTIVITY_COUNT])("accepts a valid draft with %i broker-recorded activities", async (count) => {
    const activity = recordedActivity(count);
    const knownIds = new Set(activity.map((item) => item.toolCallId));
    const knownToolCall = vi.fn(async (executionId: string, toolCallId: string) => executionId === input.executionId && knownIds.has(toolCallId));
    const envelope = { protocolVersion: 1, operationId: input.operationId, executionId: input.executionId, result, activity };
    const gateway = new DevControlIssueAuthorGateway("https://dev-control.example", "service-key", async () => Response.json(envelope), knownToolCall);
    await expect(gateway.generate(input)).resolves.toMatchObject({ result, activity });
    expect(knownToolCall).toHaveBeenCalledTimes(count);
    expect(knownToolCall).toHaveBeenLastCalledWith(input.executionId, `call-${count - 1}`);
  });

  it("rejects an unrecorded activity beyond the context budget", async () => {
    const activity = recordedActivity(RECORDED_ACTIVITY_COUNT);
    const envelope = { protocolVersion: 1, operationId: input.operationId, executionId: input.executionId, result, activity };
    const knownToolCall = vi.fn(async (_executionId: string, toolCallId: string) => toolCallId !== `call-${RECORDED_ACTIVITY_COUNT - 1}`);
    const gateway = new DevControlIssueAuthorGateway("https://dev-control.example", "service-key", async () => Response.json(envelope), knownToolCall);
    await expect(gateway.generate(input)).rejects.toMatchObject({ reason: "invalid_agent_activity" });
    expect(knownToolCall).toHaveBeenCalledTimes(RECORDED_ACTIVITY_COUNT);
  });
});
