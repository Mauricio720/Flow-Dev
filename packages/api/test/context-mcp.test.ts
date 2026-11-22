import { describe, expect, it } from "vitest";
import { registerContextMcpCleanup, search, setup } from "./context-mcp-support";

registerContextMcpCleanup();

describe("context MCP tools", () => {
  it("V-06a lists exactly the four context tools", async () => {
    const { claim, connect } = await setup();
    const tools = await (await connect(claim.contextCapability)).listTools();
    expect(tools.tools.map((tool) => tool.name).sort()).toEqual(["getGitHubIssue", "readProjectFile", "searchGitHubIssues", "searchProject"]);
  });

  it("V-06b answers with the scoped gateway result and records the call", async () => {
    const { claim, connect, dao, gateway } = await setup();
    const result = await (await connect(claim.contextCapability)).callTool(search);
    expect(result.isError).toBeFalsy();
    const payload = JSON.parse((result.content as Array<{ text: string }>)[0]!.text);
    expect(payload).toMatchObject({ status: "done", evidenceIds: [expect.any(String)] });
    expect(gateway.execute).toHaveBeenCalledTimes(1);
    expect(await dao.listCalls(claim.executionId)).toHaveLength(1);
  });

  it("V-06d answers the 13th call as unavailable by the context limit", async () => {
    const { claim, connect } = await setup();
    const client = await connect(claim.contextCapability);
    for (let index = 0; index < 12; index += 1) await client.callTool(search);
    const last = await client.callTool(search);
    const payload = JSON.parse((last.content as Array<{ text: string }>)[0]!.text);
    expect(payload).toMatchObject({ status: "unavailable", reason: "context_limit" });
  });
});
