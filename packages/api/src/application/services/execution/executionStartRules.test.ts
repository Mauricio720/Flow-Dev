import { describe, expect, it } from "vitest";
import { assertExecutionStartable, executionStartBlocker, type StartFacts } from "./executionStartRules";

const facts: StartFacts = {
  decision: { id: "decision", version: 2, status: "approved", selectedRoute: "direct_execution", uncertainties: [] },
  bindingState: "ready", repositoryArchived: false, claimed: true,
};
const request = { decisionId: "decision", expectedDecisionVersion: 2 };

describe("execution start rules", () => {
  it("UT-006 blocks a direct route with a blocking uncertainty", () => {
    expect(executionStartBlocker({ ...facts, decision: { ...facts.decision!, uncertainties: ["Bloqueante: Qual moeda?"] } })).toBe("execution_blocked_uncertainty");
  });

  it("UT-007 blocks archived repositories", () => {
    expect(executionStartBlocker({ ...facts, repositoryArchived: true })).toBe("repository_archived");
  });

  it("UT-008 requires an active claim", () => {
    expect(executionStartBlocker({ ...facts, claimed: false })).toBe("claim_required");
  });

  it("UT-009 requires approval and the current decision version", () => {
    expect(() => assertExecutionStartable({ ...facts, decision: { ...facts.decision!, status: "review" } }, request)).toThrowError("planning_not_approved");
    expect(() => assertExecutionStartable(facts, { ...request, expectedDecisionVersion: 1 })).toThrowError("planning_conflict");
  });

  it("UT-010 requires a ready Compozy binding", () => {
    expect(executionStartBlocker({ ...facts, bindingState: "invalid" })).toBe("binding_not_ready");
  });
});
