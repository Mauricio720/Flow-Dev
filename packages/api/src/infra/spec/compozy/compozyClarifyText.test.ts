import { describe, expect, it } from "vitest";
import { listInteractions, resolveInteraction } from "./compozyInteractions";
import type { CompozyRequest } from "./compozyTransport";

const IDENTITY = { socketPath: "/run/daemon.sock", workspaceId: "ws-1", sessionId: "session-1" };
const FULL_QUESTION = "Quando o usuário troca de página, como você quer mostrar a espera? Qual regra prefere?";
const FULL_CHOICE = "Manter a navegação disponível e impedir apenas a repetição da ação em andamento.";
const shortened = (requestId: string) => ({ interaction_id: `int-${requestId}`, provider_request_id: requestId, kind: "clarify", status: "pending", title: "Quando o usuário troca ...[truncated]", choices: ["Manter a navegação ...[truncated]", "Bloquear"] });
const clarifyEvent = (requestId: string) => ({ id: `${requestId}-pending`, sequence: 1, type: "clarify", turn_id: `clarify:${requestId}`, timestamp: "2026-10-08T00:57:39Z", content: { raw: { request: { request_id: requestId, question: FULL_QUESTION, choices: [FULL_CHOICE, "Bloquear"] } } } });

function daemon(pending: unknown[], events: unknown[]) {
  const calls: CompozyRequest[] = [];
  const transport = async (request: CompozyRequest) => {
    calls.push(request);
    if (request.path.includes("/events")) return { status: 200, body: { events } };
    if (request.path.endsWith("/answer")) return { status: 200, body: { choice: null, fallback: false, text: "Minha resposta" } };
    return { status: 200, body: { interactions: pending } };
  };
  return { transport, calls };
}

describe("clarification text", () => {
  it("shows the question and choices the agent wrote instead of the shortened list entry", async () => {
    const { transport, calls } = daemon([shortened("req-full")], [clarifyEvent("req-full")]);
    const [question] = await listInteractions(transport, IDENTITY);
    expect(question).toMatchObject({ title: FULL_QUESTION, choices: [FULL_CHOICE, "Bloquear"] });
    await listInteractions(transport, IDENTITY);
    expect(calls.filter((call) => call.path.includes("/events"))).toHaveLength(1);
  });

  it("keeps the shortened entry when the session has no matching clarify event", async () => {
    const { transport } = daemon([shortened("req-missing")], []);
    const [question] = await listInteractions(transport, IDENTITY);
    expect(question?.title).toBe("Quando o usuário troca ...[truncated]");
  });

  it("treats a confirmed answer as delivered when the runtime no longer lists the question", async () => {
    const { transport } = daemon([], []);
    const resolution = await resolveInteraction(transport, { ...IDENTITY, kind: "question", requestId: "req-gone", text: "Minha resposta" });
    expect(resolution).toMatchObject({ outcome: "answered", delivered: true, winningValue: "Minha resposta" });
  });
});
