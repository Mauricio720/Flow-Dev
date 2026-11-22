import { describe, expect, it } from "vitest";
import { expectFailure, run } from "./agentProcessTestSupport";

describe("agent process output", () => {
  it("V-02c rejects an output above 256 KB", async () => {
    await expectFailure(run({ mode: "big", bytes: 300 * 1024 }), "invalid_output");
    const error = await run({ mode: "big", bytes: 300 * 1024 }).catch((caught: unknown) => caught);
    expect(error).toMatchObject({ detail: "output_too_large", outputBytes: expect.any(Number) });
  });

  it("reports a missing executable as missing_binary naming the CLI", async () => {
    const error = await run({ mode: "echo" }, { command: "/nonexistent/fake-cli" }).then(() => null, (caught: unknown) => caught);
    expect(error).toMatchObject({ failure: "missing_binary", detail: "Fake CLI" });
  });

  it("returns the exit code, stdout and stderr of a CLI that fails", async () => {
    const result = await run({ mode: "fail", stderr: "oops", exitCode: 7 });
    expect(result).toMatchObject({ exitCode: 7, stderr: "oops" });
  });
});
