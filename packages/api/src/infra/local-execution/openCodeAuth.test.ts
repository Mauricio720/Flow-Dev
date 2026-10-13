import { describe, expect, it } from "vitest";
import { hasOpenCodeCredentials } from "./openCodeAuth";

describe("OpenCode authentication", () => {
  it("requires at least one stored credential", () => {
    expect(hasOpenCodeCredentials("OpenCode Go api\n1 credentials")).toBe(true);
    expect(hasOpenCodeCredentials("0 credentials")).toBe(false);
    expect(hasOpenCodeCredentials("No credentials found")).toBe(false);
  });
});
