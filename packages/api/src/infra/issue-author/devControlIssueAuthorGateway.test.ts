import { describe, expect, it, vi } from "vitest";
import type { GenerationInput } from "../../application/issue-author/issueAuthorGateway";
import { DevControlIssueAuthorGateway } from "./devControlIssueAuthorGateway";
import { TaskError } from "../../application/services/tasks/taskErrors";

const input: GenerationInput = { protocolVersion: 1, operationId: "op-1", executionId: "exec-1", messages: [{ role: "user", content: "Corrigir total" }], currentDraft: null, baseRevisionId: null, retainedEvidence: [], contextCapability: "opaque" };
const envelope = { protocolVersion: 1, operationId: "op-1", executionId: "exec-1", result: { status: "needs_clarification", question: "Qual erro acontece?" }, activity: [] };

describe("DevControlIssueAuthorGateway", () => {
  it("UT-015 calls the versioned route and accepts a matching clarification envelope", async () => {
    const fetcher = vi.fn(async (_url: string | URL | Request) => Response.json(envelope));
    const gateway = new DevControlIssueAuthorGateway("https://dev-control.example", "service-key", fetcher);
    await expect(gateway.generate(input)).resolves.toMatchObject({ operationId: "op-1", executionId: "exec-1", result: { status: "needs_clarification" } });
    expect(String(fetcher.mock.calls[0]?.[0])).toBe("https://dev-control.example/flow-dev/issue-author/v1");
  });
  it("keeps the context capability in the service header and out of agent input", async () => {
    const fetcher = vi.fn(async (_url: string | URL | Request, options?: RequestInit) => Response.json(envelope));
    await new DevControlIssueAuthorGateway("https://dev-control.example", "service-key", fetcher).generate(input);
    const options = fetcher.mock.calls[0]?.[1];
    expect(new Headers(options?.headers).get("x-flow-context-capability")).toBe("opaque");
    expect(String(options?.body)).not.toContain("contextCapability");
    expect(String(options?.body)).not.toContain("opaque");
  });
  it("keeps the priority points out of agent input", async () => {
    const fetcher = vi.fn(async (_url: string | URL | Request, options?: RequestInit) => Response.json(envelope));
    const currentDraft = { title: "Corrigir total", context: "Total antigo", objective: "Recalcular", constraints: [], relevantContext: [], productConsiderations: [], references: [], priorityPoints: 4, labels: ["backend" as const] };
    await new DevControlIssueAuthorGateway("https://dev-control.example", "service-key", fetcher).generate({ ...input, currentDraft });
    const body = String(fetcher.mock.calls[0]?.[1]?.body);
    expect(body).toContain("Total antigo");
    expect(body).not.toContain("priorityPoints");
    expect(body).not.toContain("labels");
  });
  it("UT-016 rejects an envelope for another execution", async () => {
    const gateway = new DevControlIssueAuthorGateway("https://dev-control.example", "service-key", async () => Response.json({ ...envelope, executionId: "exec-2" }));
    await expect(gateway.generate(input)).rejects.toThrowError(new TaskError("execution_mismatch"));
  });
  it("rejects mutually exclusive result branches", async () => {
    const invalid = { ...envelope, result: { status: "needs_clarification", question: "Qual erro?", draft: { title: "inventado" } } };
    const gateway = new DevControlIssueAuthorGateway("https://dev-control.example", "service-key", async () => Response.json(invalid));
    await expect(gateway.generate(input)).rejects.toThrowError(new TaskError("invalid_agent_output"));
  });
  it("UT-106 rejects activity not persisted by the broker", async () => {
    const withActivity = { ...envelope, activity: [{ toolCallId: "invented", status: "done", evidenceIds: [], durationMs: 12 }] };
    const gateway = new DevControlIssueAuthorGateway("https://dev-control.example", "service-key", async () => Response.json(withActivity));
    await expect(gateway.generate(input)).rejects.toThrowError(new TaskError("invalid_agent_activity"));
  });
  it("reports the model provider usage limit apart from an unavailable service", async () => {
    const limited = new DevControlIssueAuthorGateway("https://dev-control.example", "service-key", async () => Response.json({ error: "limit" }, { status: 429 }));
    await expect(limited.generate(input)).rejects.toMatchObject({ reason: "provider_usage_limit" });
    const failing = new DevControlIssueAuthorGateway("https://dev-control.example", "service-key", async () => Response.json({ error: "bad gateway" }, { status: 502 }));
    await expect(failing.generate(input)).rejects.toMatchObject({ reason: "provider_unavailable" });
  });
  it("UT-046 fails closed when the service endpoint is not configured", async () => {
    const fetcher = vi.fn();
    const gateway = new DevControlIssueAuthorGateway(undefined, undefined, fetcher);
    await expect(gateway.generate(input)).rejects.toThrowError(new TaskError("service_unavailable"));
    expect(fetcher).not.toHaveBeenCalled();
  });
});
