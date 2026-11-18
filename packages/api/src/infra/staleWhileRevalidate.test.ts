import { describe, expect, it, vi } from "vitest";
import { staleWhileRevalidate } from "./staleWhileRevalidate";

const WINDOW = { freshMs: 100, maxStaleMs: 1000 };

function clock(start = 0) {
  let current = start;
  return { now: () => current, advance: (ms: number) => { current += ms; } };
}

describe("staleWhileRevalidate", () => {
  it("serves a fresh value without loading again", async () => {
    const time = clock();
    const load = vi.fn(async (key: string) => `${key}-value`);
    const read = staleWhileRevalidate({ ...WINDOW, load, now: time.now });
    await read("a");
    time.advance(50);
    expect(await read("a")).toBe("a-value");
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("shares one load between concurrent callers", async () => {
    const load = vi.fn(async () => "value");
    const read = staleWhileRevalidate({ ...WINDOW, load });
    await Promise.all([read("a"), read("a"), read("a")]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("answers with the stale value and refreshes in the background", async () => {
    const time = clock();
    const load = vi.fn<(key: string) => Promise<number>>().mockResolvedValueOnce(1).mockResolvedValueOnce(2);
    const read = staleWhileRevalidate({ ...WINDOW, load, now: time.now });
    await read("a");
    time.advance(200);
    expect(await read("a")).toBe(1);
    await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(2));
    expect(await read("a")).toBe(2);
  });

  it("waits for a new value once the stale window is over", async () => {
    const time = clock();
    const load = vi.fn<(key: string) => Promise<number>>().mockResolvedValueOnce(1).mockResolvedValueOnce(2);
    const read = staleWhileRevalidate({ ...WINDOW, load, now: time.now });
    await read("a");
    time.advance(2000);
    expect(await read("a")).toBe(2);
  });

  it("does not keep values the caller rejects", async () => {
    const load = vi.fn(async () => ({ ok: false }));
    const read = staleWhileRevalidate({ ...WINDOW, load, keep: (value) => value.ok });
    await read("a");
    await read("a");
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("propagates a failed load and tries again on the next read", async () => {
    const load = vi.fn<(key: string) => Promise<string>>().mockRejectedValueOnce(new Error("down")).mockResolvedValueOnce("value");
    const read = staleWhileRevalidate({ ...WINDOW, load });
    await expect(read("a")).rejects.toThrow("down");
    expect(await read("a")).toBe("value");
  });
});
