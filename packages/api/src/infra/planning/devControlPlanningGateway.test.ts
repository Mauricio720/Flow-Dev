import { describe, expect, it, vi } from "vitest";
import type { PlanningDispatch } from "../../application/services/tasks/planningContracts";
import { DevControlPlanningGateway } from "./devControlPlanningGateway";

const input: PlanningDispatch = { protocolVersion: 1, operationId: "o", executionId: "e", taskId: "t", inputHash: "h", publication: { attemptId: "a", repositoryId: "1", repositoryNodeId: "R", issueId: "2", issueNumber: 3, title: "T", bodyMarkdown: "B" }, issueUrl: "https://github.com/acme/shop/issues/3", contextCapability: "capability-sentinel" };
const result = { recommendedRoute: "tech_spec", complexity: "medium", summary: "Resumo", reasons: ["Motivo — Detalhe"], uncertainties: ["Bloqueante: Qual escopo?", "Há migração?"] };
const decision = { route: "TECH_SPEC", complexity: "MEDIUM", summary: "Resumo", reasons: [{ code: "CONTRACT", label: "Motivo", description: "Detalhe", sourceIds: ["issue"] }], uncertainties: [{ question: "Qual escopo?", blocking: true }, { question: "Há migração?", blocking: false }], recommendedNextStep: { type: "TECH_SPEC", label: "Criar Tech Spec" } };
const envelope = (overrides: Record<string, unknown> = {}) => ({ protocolVersion: 1, operationId: "o", executionId: "e", issueRevisionId: "a", reviewStatus: "pending_review", result: decision, activity: [], ...overrides });
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });
const gateway = (fetcher: typeof fetch, timeoutMs?: number) => new DevControlPlanningGateway("https://planning.test", "service-key", fetcher, timeoutMs);
const analyze = (fetcher: typeof fetch, timeoutMs?: number) => gateway(fetcher, timeoutMs).analyze(input, new AbortController().signal);
const reason = (value: string) => expect.objectContaining({ reason: value });

describe("DevControlPlanningGateway", () => {
  it("UT-032 returns the assessment after checking correlation", async () => {
    const fetcher = vi.fn(async () => json(envelope())) as unknown as typeof fetch;
    expect(await analyze(fetcher)).toEqual({ protocolVersion: 1, operationId: "o", executionId: "e", taskId: "t", inputHash: "h", result });
    expect(fetcher).toHaveBeenCalledWith(new URL("https://planning.test/flow-dev/planning/v1"), expect.objectContaining({ redirect: "error", headers: expect.objectContaining({ "idempotency-key": "o", authorization: "Bearer service-key", "x-flow-context-capability": "capability-sentinel" }) }));
  });

  it("sends the published Issue snapshot in the Dev Control contract without the capability", async () => {
    const fetcher = vi.fn(async (_url: unknown, _init: RequestInit) => json(envelope()));
    await analyze(fetcher as unknown as typeof fetch);
    const body = String(fetcher.mock.calls[0]![1].body);
    expect(JSON.parse(body)).toEqual({ protocolVersion: 1, operationId: "o", executionId: "e", issueRevisionId: "a", issue: { publicationStatus: "published", repository: "acme/shop", issueNumber: 3, url: "https://github.com/acme/shop/issues/3", title: "T", body: "B", labels: [], structuredDraft: null } });
    expect(body).not.toContain("capability-sentinel");
  });

  it.each(["https://github.com/acme/issues/3", "not a url"])("fails before any request when the stored Issue URL is %s", async (issueUrl) => {
    const fetcher = vi.fn() as unknown as typeof fetch;
    await expect(gateway(fetcher).analyze({ ...input, issueUrl }, new AbortController().signal)).rejects.toMatchObject(reason("invalid_stored_content"));
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([["a reason without label", { reasons: [{ code: "X", description: null, sourceIds: ["issue"] }] }], ["an uncertainty without the blocking flag", { uncertainties: [{ question: "Qual?" }] }], ["an unknown complexity", { complexity: "medium" }]])("rejects %s", async (_name, change) => {
    await expect(analyze(async () => json(envelope({ result: { ...decision, ...change } })))).rejects.toMatchObject(reason("planning_invalid_output"));
  });

  it.each(["operationId", "executionId", "issueRevisionId"])("UT-033 rejects a wrong %s", async (field) => {
    await expect(analyze(async () => json(envelope({ [field]: "other" })))).rejects.toMatchObject(reason("planning_execution_mismatch"));
  });

  it.each([["invalid JSON", "not json"], ["empty body", ""], ["unknown protocol", JSON.stringify(envelope({ protocolVersion: 2 }))], ["unsupported route", JSON.stringify(envelope({ result: { ...decision, route: "TASKS" } }))], ["extra field", JSON.stringify(envelope({ extra: true }))], ["an approved review", JSON.stringify(envelope({ reviewStatus: "approved" }))]])("UT-034 rejects %s", async (_name, body) => {
    await expect(analyze(async () => new Response(body))).rejects.toMatchObject(reason("planning_invalid_output"));
  });

  it("UT-035 accepts a response padded to exactly 256 KiB", async () => {
    const base = JSON.stringify(envelope());
    const padded = base + " ".repeat(256 * 1024 - Buffer.byteLength(base));
    expect((await analyze(async () => new Response(padded))).result).toEqual(result);
  });

  it("UT-036 cancels a streamed response above 256 KiB", async () => {
    const cancel = vi.fn();
    const stream = new ReadableStream({ pull(controller) { controller.enqueue(new Uint8Array(256 * 1024 + 1)); }, cancel });
    await expect(analyze(async () => new Response(stream))).rejects.toMatchObject(reason("planning_invalid_output"));
    expect(cancel).toHaveBeenCalled();
  });

  it("UT-037 aborts when no body completes before the deadline", async () => {
    const hanging = ((_url: unknown, init: RequestInit) => new Promise((_resolve, reject) => init.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError"))))) as unknown as typeof fetch;
    await expect(analyze(hanging, 20)).rejects.toMatchObject(reason("planning_timeout"));
  });

  it.each([[409, "planning_invalid_output"], [422, "planning_invalid_output"], [400, "planning_input_limit"], [413, "planning_input_limit"], [401, "planning_unconfigured"], [403, "planning_unconfigured"], [429, "planning_rate_limited"], [408, "planning_provider_unavailable"], [500, "planning_provider_unavailable"]])("UT-038 maps HTTP %i to %s without response text", async (status, expected) => {
    const error = await analyze(async () => new Response("remote secret text", { status, headers: { "retry-after": "12" } })).catch((caught) => caught);
    expect(error).toMatchObject(reason(expected));
    expect(String(error.message) + String(error.cause)).not.toContain("remote secret");
    if (status === 429) expect(error.retryAfterSeconds).toBe(12);
  });

  it("UT-039 refuses a redirect response", async () => {
    const fetcher = vi.fn(async () => new Response(null, { status: 302, headers: { location: "https://elsewhere.test" } })) as unknown as typeof fetch;
    await expect(analyze(fetcher)).rejects.toMatchObject(reason("planning_provider_unavailable"));
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("UT-080 maps a network rejection to a safe unavailable error", async () => {
    const error = await analyze(async () => { throw new TypeError("connect ECONNREFUSED secret-host"); }).catch((caught) => caught);
    expect(error).toMatchObject(reason("planning_provider_unavailable"));
    expect(error.message).not.toContain("secret-host");
  });

  it.each([["a non-loopback http URL", "http://planning.test"], ["an unparsable URL", "not a url"]])("fails before any request for %s", async (_name, baseUrl) => {
    const fetcher = vi.fn() as unknown as typeof fetch;
    await expect(new DevControlPlanningGateway(baseUrl, "service-key", fetcher).analyze(input, new AbortController().signal)).rejects.toMatchObject(reason("planning_unconfigured"));
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("fails before any request when configuration is missing", async () => {
    const fetcher = vi.fn() as unknown as typeof fetch;
    await expect(new DevControlPlanningGateway(undefined, undefined, fetcher).analyze(input, new AbortController().signal)).rejects.toMatchObject(reason("planning_unconfigured"));
    expect(fetcher).not.toHaveBeenCalled();
  });
});
