import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readWithRetry } from "./readWithRetry";

describe("readWithRetry", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("recovers from a transient failure without surfacing it", async () => {
    const read = vi.fn().mockRejectedValueOnce(new Error("413")).mockResolvedValue("documents");
    const result = readWithRetry(read);
    await vi.runAllTimersAsync();
    await expect(result).resolves.toBe("documents");
    expect(read).toHaveBeenCalledTimes(2);
  });

  it("fails after the last attempt keeps failing", async () => {
    const read = vi.fn().mockRejectedValue(new Error("offline"));
    const result = readWithRetry(read);
    const assertion = expect(result).rejects.toThrow("offline");
    await vi.runAllTimersAsync();
    await assertion;
    expect(read).toHaveBeenCalledTimes(3);
  });

  it("stops retrying once the reader is no longer active", async () => {
    const read = vi.fn().mockRejectedValue(new Error("offline"));
    const result = readWithRetry(read, () => false);
    const assertion = expect(result).rejects.toThrow("offline");
    await vi.runAllTimersAsync();
    await assertion;
    expect(read).toHaveBeenCalledTimes(2);
  });
});
