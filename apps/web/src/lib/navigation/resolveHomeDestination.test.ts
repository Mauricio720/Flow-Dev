import { describe, expect, it } from "vitest";
import { resolveHomeDestination, retainProjectState } from "./resolveHomeDestination";

describe("private project navigation", () => {
  it("falls back to the selector when the last project was revoked", () => expect(resolveHomeDestination("pA", ["pB"])).toBe("/projects"));
  it("clears visual project state after revocation", () => expect(retainProjectState("pA", ["pB"])).toBeNull());
  it("keeps an explicitly authorized project", () => expect(resolveHomeDestination("pA", ["pA"])).toBe("/projects/pA"));
});
