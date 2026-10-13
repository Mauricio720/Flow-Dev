import { describe, expect, it } from "vitest";
import { COMPOZY_PIN } from "../../../application/spec/specPins";
import { WorkerReconciler } from "../../../application/services/task-flow/workerReconciler";
import { PinnedCompozyControlGateway } from "./compozyControlGateway";
import type { CompozyRequest, CompozyResponse } from "./compozyTransport";

const AT = "2026-10-08T19:58:58Z";
const REF = { workspaceId: "ws-1", name: "implement-tasks", runId: "loop-1" };
const RUN = { id: "loop-1", status: "running", created_at: AT, generation: 2, last_progress_at: AT, progress: { round: 2, steps_done: 2, steps_total: 5 } };
const OUTPUT = { node_id: "implement_task", item_index: 2, status: "running", session_id: "session-3" };
const event = (sequence: number, type: string, content: unknown) => ({ id: `event-${sequence}`, sequence, type, turn_id: "turn-1", timestamp: AT, content });

function harness(body: unknown, events: unknown = { events: [] }) {
  const calls: CompozyRequest[] = [];
  const transport = async (request: CompozyRequest): Promise<CompozyResponse> => {
    calls.push(request);
    if (request.path === "/api/status/identity") return { status: 200, body: { schema_version: "2026-07-16", daemon: { version: COMPOZY_PIN.version } } };
    return { status: 200, body: request.path.includes("/events?") ? events : body };
  };
  return { gateway: new PinnedCompozyControlGateway({ transport, declaredOpenApiSha256: COMPOZY_PIN.openApiSha256 }), calls };
}

describe("Loop diagnostics", () => {
  it("reports real progress and the latest public message from the current generation", async () => {
    const body = { run: RUN, generations: [{ generation: 1, outputs: [{ ...OUTPUT, status: "failed", session_id: "old" }] }, { generation: 2, outputs: [OUTPUT] }] };
    const { gateway, calls } = harness(body, { events: [event(1, "agent_message", { text: "Validando o upload." }), event(2, "thought", { text: "PRIVATE" })] });
    const result = await gateway.getLoopRun(REF);
    expect(result).toMatchObject({ ok: true, value: { state: "running", activity: { kind: "agent_message", preview: expect.stringContaining("2/5 concluídas"), at: AT } } });
    if (!result.ok) throw new Error("status unavailable");
    expect(result.value.activity?.preview).toContain("item 3");
    expect(result.value.activity?.preview).toContain("Validando o upload.");
    expect(result.value.activity?.preview).not.toContain("PRIVATE");
    expect(calls.some((call) => call.path.includes("/sessions/old/"))).toBe(false);
    expect(new WorkerReconciler().resolve(result.value).activity).toEqual(result.value.activity);
  });

  it("keeps the provider error after a later lifecycle event and classifies the reported limit", async () => {
    const body = { run: { ...RUN, status: "failed" }, generations: [{ generation: 2, outputs: [{ ...OUTPUT, status: "failed" }] }] };
    const error = { ...event(8, "error", {}), failure: { summary: "You’ve hit your usage limit. Try again at 4:59 PM." }, provider_error: { code: "provider_rate_limited", guidance: "retry later" } };
    const { gateway } = harness(body, { events: [error, event(9, "turn_done", { status: "error" }), event(10, "agent_message", { text: "Encerrando a sessão." })] });
    const result = await gateway.getLoopRun(REF);
    expect(result).toMatchObject({ ok: true, value: { terminalReason: "usage_limit_exceeded", activity: { kind: "warning", preview: expect.stringContaining("Try again at 4:59 PM") } } });
    if (!result.ok) throw new Error("status unavailable");
    expect(new WorkerReconciler().resolve(result.value)).toMatchObject({ state: "failed", code: "usage_limit_exceeded", activity: { kind: "warning" } });
  });

  it("fails a still-running review when the current node reports the Codex usage limit", async () => {
    const reason = 'No write_artifacts: pending. {"code":-32603,"message":"Internal error","data":{"code":"usageLimitExceeded","message":"You’ve hit your usage limit."}}';
    const body = { run: { ...RUN, progress: { round: 0, steps_done: 0, steps_total: 0 } }, node_controls: [{ attention_reason: reason, updated_at: AT }] };
    const { gateway } = harness(body);
    const result = await gateway.getLoopRun({ ...REF, name: "review-and-fix" });
    expect(result).toMatchObject({ ok: true, value: { state: "running", terminalReason: "usage_limit_exceeded", activity: { kind: "warning", status: "usage_limit_exceeded", preview: expect.stringContaining("You’ve hit your usage limit") } } });
    if (!result.ok) throw new Error("status unavailable");
    expect(result.value.activity?.preview).toBe("You’ve hit your usage limit.");
    expect(new WorkerReconciler().resolve(result.value)).toMatchObject({ state: "failed", code: "usage_limit_exceeded" });
  });

  it("keeps a usage-limit error from the active session after a later message", async () => {
    const body = { run: RUN, generations: [{ generation: 2, outputs: [OUTPUT] }] };
    const error = { ...event(8, "error", {}), failure: { summary: '{"data":{"code":"usageLimitExceeded"}}' } };
    const { gateway } = harness(body, { events: [error, event(9, "agent_message", { text: "Encerrando a sessão." })] });
    const result = await gateway.getLoopRun(REF);
    expect(result).toMatchObject({ ok: true, value: { terminalReason: "usage_limit_exceeded", activity: { kind: "warning", status: "usage_limit_exceeded" } } });
    if (!result.ok) throw new Error("status unavailable");
    expect(new WorkerReconciler().resolve(result.value)).toMatchObject({ state: "failed", code: "usage_limit_exceeded" });
  });

  it("derives progress from the current generation when the runtime reports none", async () => {
    const node = (node_id: string, status: string) => ({ node_id, status });
    const retried = { generation: 3, origin: "reattempt", outputs: [node("collect_fixes", "pending"), node("fix_batch", "enqueued"), node("review", "succeeded"), node("write_artifacts", "succeeded")] };
    const generations = [{ generation: 1, origin: "initial", outputs: [node("review", "succeeded")] }, { generation: 2, origin: "stop_when", outputs: [node("review", "failed")] }, retried];
    const { gateway } = harness({ run: { ...RUN, generation: 3, progress: { round: 0, steps_done: 0, steps_total: 0 } }, generations });
    const result = await gateway.getLoopRun({ ...REF, name: "review-and-fix" });
    if (!result.ok) throw new Error("status unavailable");
    expect(result.value.activity?.preview).toBe("Etapas do Loop: 2/4 concluídas · rodada 2. Nó fix_batch: em execução.");
  });

  it("does not lose authoritative status when optional diagnostics or session events are unavailable", async () => {
    const malformed = harness({ run: { ...RUN, progress: "invalid" } });
    expect(await malformed.gateway.getLoopRun(REF)).toMatchObject({ ok: true, value: { state: "running" } });
    const missing = harness({ run: RUN, generations: [{ generation: 2, outputs: [OUTPUT] }] }, { invalid: true });
    expect(await missing.gateway.getLoopRun(REF)).toMatchObject({ ok: true, value: { state: "running", activity: { kind: "lifecycle", preview: expect.stringContaining("2/5 concluídas") } } });
  });

  it("redacts secrets and never exposes private reasoning or raw event objects", async () => {
    const token = `sk-${"x".repeat(30)}`;
    const body = { run: RUN, generations: [{ generation: 2, outputs: [OUTPUT] }] };
    const { gateway } = harness(body, { events: [event(1, "agent_message", { text: `Reading /home/private/auth.json with ${token}` }), event(2, "reasoning", { text: "PRIVATE" })] });
    const result = await gateway.getLoopRun(REF);
    expect(JSON.stringify(result)).not.toContain(token);
    expect(JSON.stringify(result)).not.toContain("/home/private");
    expect(JSON.stringify(result)).not.toContain("PRIVATE");
    const structured = harness(body, { events: [event(3, "tool_result", { name: "exec_command", result: { raw: "PRIVATE_PAYLOAD" } })] });
    const toolResult = await structured.gateway.getLoopRun(REF);
    expect(JSON.stringify(toolResult)).not.toContain("PRIVATE_PAYLOAD");
    expect(toolResult).toMatchObject({ ok: true, value: { activity: { tool: "exec_command", preview: expect.stringContaining("A ferramenta retornou uma atualização.") } } });
  });
});
