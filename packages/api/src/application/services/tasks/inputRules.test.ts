import { describe, expect, it } from "vitest";
import { buildGenerationInput, validateHistorySearch, validateUserMessage } from "./inputRules";
import { TaskError } from "./taskErrors";

describe("task input limits", () => {
  it("UT-071 accepts exactly 10,000 Unicode code points", () => expect(validateUserMessage("😀".repeat(10_000))).toHaveLength(20_000));
  it("UT-072 rejects 10,001 code points without mutating the supplied value", () => {
    const value = "😀".repeat(10_001);
    expect(() => validateUserMessage(value)).toThrowError(new TaskError("input_limit"));
    expect(value).toHaveLength(20_002);
  });
  it("UT-002 rejects whitespace-only user messages", () => expect(() => validateUserMessage(" \n\t ")).toThrowError(new TaskError("blank_message")));
  it("UT-073 accepts serialized generation context at 100,000 bytes", () => {
    const prefix = "{\"value\":\"";
    const suffix = "\"}";
    const input = { value: "a".repeat(100_000 - Buffer.byteLength(prefix + suffix)) };
    expect(() => buildGenerationInput(input)).not.toThrow();
  });
  it("UT-074 rejects serialized generation context at 100,001 bytes", () => expect(() => buildGenerationInput({ value: "a".repeat(100_000) })).toThrowError(new TaskError("input_capacity")));
  it("rejects search longer than 200 code points", () => expect(() => validateHistorySearch("😀".repeat(201))).toThrowError(new TaskError("input_limit")));
});
