import { describe, expect, it } from "vitest";
import { submitPrompt } from "./compozyPrompt";
import { rejectedSubmission } from "./submissionRejection";

const REASONING_MESSAGE = 'acp: reasoning effort "high" is unavailable: provider reasoning apply strategy is "none"';
const prompt = { socketPath: "/run/daemon.sock", workspaceId: "ws-1", sessionId: "s-1", messageId: "m-1", idempotencyKey: "k-1", message: "hello", provider: "codex", model: "gpt-6.1-sol", reasoningEffort: "high" };

describe("runtime submission rejection", () => {
  it("keeps the code and the message the runtime gave when it refuses the prompt", async () => {
    const body = { error: `session: bind runtime agent: ${REASONING_MESSAGE}`, diagnostic: { code: "reasoning_option_missing", message: REASONING_MESSAGE } };
    const submission = await submitPrompt(async () => ({ status: 422, body }) as never, prompt);
    expect(submission).toMatchObject({ status: "rejected", rejection: { code: "reasoning_option_missing", message: REASONING_MESSAGE } });
  });

  it("names an unsupported reasoning effort instead of blaming the model", () => {
    expect(rejectedSubmission({ code: "reasoning_option_missing", message: REASONING_MESSAGE })).toEqual({ kind: "blocked", code: "reasoning_effort_unsupported", detail: `O CompozyOS recusou a configuração: ${REASONING_MESSAGE}` });
  });

  it("falls back to an unavailable model when the runtime gives no diagnostic", () => {
    expect(rejectedSubmission(undefined)).toEqual({ kind: "blocked", code: "model_unavailable" });
    expect(rejectedSubmission({ code: "model_not_found", message: "unknown model" })).toMatchObject({ code: "model_unavailable", detail: "O CompozyOS recusou a configuração: unknown model" });
  });
});
