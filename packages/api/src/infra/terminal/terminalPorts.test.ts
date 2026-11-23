import { describe, expect, it } from "vitest";
import { PathToolLocator } from "./pathToolLocator";
import { terminalPorts } from "./terminalPorts";

const SCRIPT = { FLOW_DEV_SESSION_FAKE_SCRIPT: "/tmp/scripts" };

describe("terminalPorts", () => {
  it("accepts any tool only when the fake script is set in the test environment", async () => {
    const { tools } = terminalPorts({ ...SCRIPT, NODE_ENV: "test", PATH: "" });
    expect(await tools.has("claude")).toBe(true);
  });

  it.each(["development", "production", undefined])("looks for the real binary in the PATH when NODE_ENV is %s, even with the fake script set", async (nodeEnv) => {
    const { tools } = terminalPorts({ ...SCRIPT, NODE_ENV: nodeEnv, PATH: "" });
    expect(tools).toBeInstanceOf(PathToolLocator);
    expect(await tools.has("claude")).toBe(false);
  });

  it("looks for the real binary without the fake script, even in the test environment", () => {
    expect(terminalPorts({ NODE_ENV: "test" }).tools).toBeInstanceOf(PathToolLocator);
  });
});
