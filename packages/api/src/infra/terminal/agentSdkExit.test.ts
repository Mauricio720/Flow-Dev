import { describe, expect, it } from "vitest";
import { agentSdkExit } from "./agentSdkExit";

describe("agentSdkExit usage limit", () => {
  it("classifies usage text and HTTP 429 while preserving the started session transition", () => {
    expect(agentSdkExit({ error: new Error("You've hit your usage limit"), closing: false, started: true, stderr: "" })).toMatchObject({ kind: "crashed", limit: true });
    expect(agentSdkExit({ error: { status: 429 }, closing: false, started: false, stderr: "" })).toMatchObject({ kind: "failed", limit: true });
  });

  it("keeps ordinary failures and deliberate closing unchanged", () => {
    const crashed = agentSdkExit({ error: new Error("network reset"), closing: false, started: true, stderr: "" });
    expect(crashed).toMatchObject({ kind: "crashed" });
    expect(crashed).not.toHaveProperty("limit");
    expect(agentSdkExit({ error: new Error("usage limit"), closing: true, started: true, stderr: "" })).toEqual({ kind: "ended" });
  });
});
