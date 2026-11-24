import { describe, expect, it } from "vitest";
import { CodexRpcFrames } from "./codexRpcFrames";

const frame = (text: string) => Buffer.from(`${JSON.stringify({ jsonrpc: "2.0", method: "notice", params: { text } })}\n`);

describe("CodexRpcFrames", () => {
  it("preserves UTF-8 characters split across chunks and parses joined frames", () => {
    const frames = new CodexRpcFrames();
    const first = frame("ação");
    const split = first.indexOf(Buffer.from("ç")) + 1;
    expect(frames.push(first.subarray(0, split))).toEqual([]);
    expect(frames.push(Buffer.concat([first.subarray(split), frame("fim")]))).toEqual([
      { jsonrpc: "2.0", method: "notice", params: { text: "ação" } },
      { jsonrpc: "2.0", method: "notice", params: { text: "fim" } },
    ]);
    expect(() => frames.finish()).not.toThrow();
  });

  it("rejects an incomplete frame at EOF", () => {
    const frames = new CodexRpcFrames();
    frames.push(Buffer.from('{"jsonrpc":"2.0"}'));
    expect(() => frames.finish()).toThrow("incomplete JSON-RPC frame");
  });
});
