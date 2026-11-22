import { describe, expect, it } from "vitest";
import { CONTEXT_TOOLS, parseContextToolInput } from "./contextMcpTools";

const tool = (name: string) => CONTEXT_TOOLS.find((item) => item.name === name)!;

describe("context MCP tools", () => {
  it("exposes exactly the four context tools", () => {
    expect(CONTEXT_TOOLS.map((item) => item.name)).toEqual(["searchProject", "readProjectFile", "searchGitHubIssues", "getGitHubIssue"]);
  });

  it("V-06e refuses a read of 300 lines or more and accepts 299", () => {
    const read = tool("readProjectFile");
    expect(parseContextToolInput(read, { path: "src/a.ts", fromLine: 1, toLine: 301 })).toBeNull();
    expect(parseContextToolInput(read, { path: "src/a.ts", fromLine: 1, toLine: 300 })).toEqual({ tool: "readProjectFile", path: "src/a.ts", fromLine: 1, toLine: 300 });
    expect(parseContextToolInput(read, { path: "src/a.ts", fromLine: 10, toLine: 5 })).toBeNull();
  });

  it("V-06h refuses a one character query and turns 2 to 180 characters into a request", () => {
    const search = tool("searchProject");
    expect(parseContextToolInput(search, { query: "a" })).toBeNull();
    expect(parseContextToolInput(search, { query: "ab" })).toEqual({ tool: "searchProject", query: "ab" });
    expect(parseContextToolInput(search, { query: "x".repeat(180) })).not.toBeNull();
    expect(parseContextToolInput(search, { query: "x".repeat(181) })).toBeNull();
  });

  it("maps Issue lookups and rejects a non positive Issue number", () => {
    expect(parseContextToolInput(tool("getGitHubIssue"), { issueNumber: 42 })).toEqual({ tool: "getGitHubIssue", issueNumber: 42 });
    expect(parseContextToolInput(tool("getGitHubIssue"), { issueNumber: 0 })).toBeNull();
    expect(parseContextToolInput(tool("searchGitHubIssues"), { query: "login" })).toEqual({ tool: "searchGitHubIssues", query: "login" });
  });
});
