import { describe, expect, it, vi } from "vitest";
import { ensurePaired } from "./localConnectorPairing";

const noWait = async () => {};

describe("ensurePaired", () => {
  it("does not pair a computer that is already paired", async () => {
    const pair = vi.fn();
    await ensurePaired({ isPaired: async () => true, pair, sleep: noWait });
    expect(pair).not.toHaveBeenCalled();
  });
  it("keeps trying while the server is still starting and stops once paired", async () => {
    const isPaired = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(false).mockResolvedValue(true);
    const pair = vi.fn().mockRejectedValueOnce(new Error("connector_unavailable")).mockResolvedValueOnce({});
    await ensurePaired({ isPaired, pair, sleep: noWait });
    expect(pair).toHaveBeenCalledTimes(2);
  });
  it("gives up on a failure that retrying cannot fix", async () => {
    const pair = vi.fn().mockRejectedValue(new Error("invalid_server"));
    await expect(ensurePaired({ isPaired: async () => false, pair, sleep: noWait })).rejects.toThrow("invalid_server");
    expect(pair).toHaveBeenCalledOnce();
  });
});
