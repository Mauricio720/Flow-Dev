import { describe, expect, it } from "vitest";
import { normalizeSpecEvent } from "./normalizeSpecEvent";

const event = (type: string, content: unknown, sequence = 1) => ({ sequence, id: `e${sequence}`, type, turnId: "t1", timestamp: "2026-10-05T10:00:00Z", content });
const ROOT = "/srv/spec/202/task/attempts/a1/candidate";

describe("normalizeSpecEvent", () => {
  it("UT-037 joins a tool result to its call identity and keeps only a safe relative source", () => {
    const result = normalizeSpecEvent(event("tool_result", { tool_call_id: "c1", name: "read", output: "ok", path: `${ROOT}/_techspec.md` }), ROOT);
    expect(result).toMatchObject({ kind: "tool_result", payload: { toolCallId: "c1", tool: "read", source: "_techspec.md" } });
  });

  it("UT-038 projects nothing for private reasoning events", () => {
    for (const type of ["thought", "reasoning", "agent_thought"]) expect(normalizeSpecEvent(event(type, "segredo do modelo"), ROOT)).toBeNull();
  });

  it("IT-021 keeps markup inert as text and flags unknown kinds as unsupported without content", () => {
    const message = normalizeSpecEvent(event("agent_message", "<img onerror=alert(1)>"), ROOT);
    expect(message).toMatchObject({ kind: "agent_message", payload: { text: "<img onerror=alert(1)>" } });
    const unknown = normalizeSpecEvent(event("provider_internal_dump", { raw: "x" }), ROOT);
    expect(unknown).toMatchObject({ kind: "unsupported", payload: { text: "", originalType: "provider_internal_dump" } });
  });

  it("IT-207 drops credentials, authorization headers and absolute host paths before persistence", () => {
    const result = normalizeSpecEvent(event("tool_result", { tool_call_id: "c2", output: "Authorization: Bearer canary-secret escreveu /home/mauricio/projeto/.env", headers: { authorization: "canary-secret" }, api_key: "canary-secret" }), ROOT);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("canary-secret");
    expect(serialized).not.toContain("/home/mauricio");
    expect(result?.payload.omitted).toEqual(expect.arrayContaining(["secret", "host_path"]));
  });

  it("limits the preview to 16 KiB and the saved detail to 1 MiB with explicit omission metadata", () => {
    const large = normalizeSpecEvent(event("agent_message", "a".repeat(20_000)), ROOT)!;
    expect(Buffer.byteLength(large.payload.text)).toBe(20_000);
    expect(Buffer.byteLength(large.payload.preview)).toBe(16 * 1024);
    const huge = normalizeSpecEvent(event("agent_message", "b".repeat(1024 * 1024 + 10)), ROOT)!;
    expect(Buffer.byteLength(huge.payload.text)).toBe(1024 * 1024);
    expect(huge.payload.omitted).toContain("size_limit");
  });

  it("classifies lifecycle and warning events as public", () => {
    expect(normalizeSpecEvent(event("done", { status: "completed" }), ROOT)).toMatchObject({ kind: "lifecycle", payload: { status: "completed" } });
    expect(normalizeSpecEvent(event("warning", "latência"), ROOT)?.kind).toBe("warning");
  });
});
