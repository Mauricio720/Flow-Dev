import { describe, expect, it } from "vitest";
import { failureDetailOf, sanitizeFailureDetail } from "./localFailureDetail";
import { LocalExecutionError } from "./localExecutionErrors";
import { localPayloadHash } from "./localHash";
import { validateLocalEvent } from "./localProtocol";

const CHECKOUT = "/home/dev/projects/shop";
const context = { checkoutRoot: CHECKOUT, home: "/home/dev", secrets: ["super-secret-value"] };

describe("local failure detail", () => {
  it("reads the explanation attached to a domain error and ignores errors without one", () => {
    expect(failureDetailOf(new LocalExecutionError("runtime_incompatible", { cause: "CompozyOS local incompatível" }))).toBe("CompozyOS local incompatível");
    expect(failureDetailOf(new LocalExecutionError("runtime_incompatible"))).toBeNull();
    expect(failureDetailOf(Object.assign(new Error("O CompozyOS recusou abrir o projeto"), { reason: "workspace_unavailable" }))).toBe("O CompozyOS recusou abrir o projeto");
    expect(failureDetailOf("plain text")).toBeNull();
  });

  it("keeps the useful part of a runtime message while hiding local paths and secrets", () => {
    const raw = `load .env file "${CHECKOUT}/.env": line 28 is not a KEY=VALUE assignment; token super-secret-value at /home/dev/.config`;
    expect(sanitizeFailureDetail(raw, context)).toBe('load .env file "[checkout local]/.env": line 28 is not a KEY=VALUE assignment; token [redacted] at ~/.config');
  });

  it("drops a detail that would still expose a local path or a credential", () => {
    expect(sanitizeFailureDetail("failed at /Users/other/private", context)).toBeNull();
    expect(sanitizeFailureDetail(`clone https://user:pass@example.com failed with ghp_${"a".repeat(30)}`, context)).toBe("clone [redacted]example.com failed with [redacted]");
    expect(sanitizeFailureDetail("", context)).toBeNull();
  });

  it("travels in the terminal event of the connector protocol", () => {
    const payload = { outcome: "blocked", reason: "runtime_incompatible", checkoutDigest: null, artifactsSafe: false, runtimeSucceeded: false, detail: "CompozyOS local incompatível" };
    const event = { protocolVersion: 1, commandId: "11111111-1111-4111-8111-111111111111", runId: "22222222-2222-4222-8222-222222222222", fence: 1, sequence: 1, kind: "terminal", payload, payloadHash: localPayloadHash(payload) };
    expect(validateLocalEvent(event)).toMatchObject({ payload: { detail: "CompozyOS local incompatível" } });
  });
});
