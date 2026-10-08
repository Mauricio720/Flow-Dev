import { describe, expect, it } from "vitest";
import { localPayloadHash } from "./localHash";
import { validateLocalEvent } from "./localProtocol";
import { pendingQuestions } from "./localQuestions";

const report = (interactionId: string, status: string, title = "Qual banco usar?") => ({ kind: "question", payload: { interactionId, status, title, choices: ["Postgres", "SQLite"] } });
const envelope = (kind: string, payload: Record<string, unknown>) => ({ protocolVersion: 1, commandId: "11111111-1111-4111-8111-111111111111", runId: "22222222-2222-4222-8222-222222222222", fence: 1, sequence: 2, kind, payload, payloadHash: localPayloadHash(payload) });

describe("local run questions", () => {
  it("lists a question while it waits and drops it once the connector reports it resolved", () => {
    const events = [{ kind: "activity", payload: { summary: "working" } }, report("q-1", "pending"), report("q-2", "pending", "Qual fila?"), report("q-1", "resolved")];
    expect(pendingQuestions(events)).toEqual([{ id: "q-2", title: "Qual fila?", choices: ["Postgres", "SQLite"] }]);
    expect(pendingQuestions([])).toEqual([]);
  });

  it("travels in the connector protocol together with the richer activity report", () => {
    expect(validateLocalEvent(envelope("question", report("q-1", "pending").payload))).toMatchObject({ kind: "question", payload: { interactionId: "q-1", status: "pending" } });
    const activity = { summary: "read_file", relativeFiles: ["src/index.ts"], kind: "tool_call", tool: "read_file", status: null };
    expect(validateLocalEvent(envelope("activity", activity))).toMatchObject({ payload: { kind: "tool_call", tool: "read_file" } });
    expect(validateLocalEvent(envelope("activity", { summary: "older connector", relativeFiles: [] }))).toMatchObject({ kind: "activity" });
  });
});
