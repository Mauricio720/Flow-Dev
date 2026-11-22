import { describe, expect, it } from "vitest";
import { splitFailureCode, withFailureDetail } from "./failureCode";

describe("failure code", () => {
  it("round trips a reason with a safe detail", () => {
    const code = withFailureDetail("local_agent_unavailable", "Codex: rode `codex login`");
    expect(splitFailureCode(code)).toEqual({ reason: "local_agent_unavailable", detail: "Codex: rode `codex login`" });
  });

  it("keeps only the reason when there is no detail or the detail is unsafe", () => {
    expect(withFailureDetail("provider_usage_limit")).toBe("provider_usage_limit");
    expect(withFailureDetail("provider_usage_limit", "a|b")).toBe("provider_usage_limit");
    expect(withFailureDetail("provider_usage_limit", "x".repeat(161))).toBe("provider_usage_limit");
    expect(splitFailureCode("provider_usage_limit")).toEqual({ reason: "provider_usage_limit" });
  });
});
