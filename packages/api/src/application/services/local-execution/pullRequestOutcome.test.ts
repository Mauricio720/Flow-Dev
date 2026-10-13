import { describe, expect, it } from "vitest";
import { pullRequestFailureOf } from "./pullRequestOutcome";

describe("pullRequestFailureOf", () => {
  it("accepts an opened pull request that reports its address", () => {
    expect(pullRequestFailureOf("status: OPENED\nurl: https://github.com/acme/flow/pull/42\nreason: PR aberta.")).toBeNull();
  });

  it("fails a run that left no readable outcome or no pull request address", () => {
    const missing = { outcome: "failed", reason: "pull_request_outcome_missing", detail: null };
    expect(pullRequestFailureOf(null)).toEqual(missing);
    expect(pullRequestFailureOf("status: DONE\nurl: https://github.com/acme/flow/pull/42")).toEqual(missing);
    expect(pullRequestFailureOf("status: OPENED\nurl: https://example.com/acme/flow/pull/42")).toEqual(missing);
    expect(pullRequestFailureOf("status: OPENED\nreason: PR aberta.")).toEqual(missing);
  });

  it("blocks the action with the reported reason when publication could not finish", () => {
    expect(pullRequestFailureOf("status: BLOCKED\nreason: O gh não está autenticado nesta máquina.")).toEqual({ outcome: "blocked", reason: "pull_request_blocked", detail: "O gh não está autenticado nesta máquina." });
    expect(pullRequestFailureOf("status: BLOCKED")).toEqual({ outcome: "blocked", reason: "pull_request_blocked", detail: null });
  });
});
