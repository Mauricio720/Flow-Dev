import { describe, expect, it } from "vitest";
import { directFailureOf } from "./directOutcome";

describe("directFailureOf", () => {
  it("accepts a completed report", () => {
    expect(directFailureOf("status: COMPLETED\nreason: Implementado e verificado.\n\n## Changes")).toBeNull();
  });

  it("fails a run that left no readable outcome", () => {
    expect(directFailureOf(null)).toEqual({ outcome: "failed", reason: "direct_outcome_missing", detail: null });
    expect(directFailureOf("status: DONE\nreason: ok")).toEqual({ outcome: "failed", reason: "direct_outcome_missing", detail: null });
  });

  it("blocks the action with the reported reason when the route no longer fits", () => {
    expect(directFailureOf("status: ROUTING_MISMATCH\nreason: Falta decidir a regra de permissão.")).toEqual({ outcome: "blocked", reason: "routing_mismatch", detail: "Falta decidir a regra de permissão." });
  });

  it("blocks partial and operationally blocked runs", () => {
    expect(directFailureOf("status: PARTIAL\nreason: Faltam os testes.")?.reason).toBe("direct_partial");
    expect(directFailureOf("status: BLOCKED")).toEqual({ outcome: "blocked", reason: "direct_blocked", detail: null });
  });
});
