import { describe, expect, it, vi } from "vitest";
import type { AccessDao } from "../../database/dao/accessDao";
import { AuthoringAccessPolicy } from "./authoringAccessPolicy";

const policy = (admin: boolean) => new AuthoringAccessPolicy({ isAdmin: vi.fn(async () => admin) } as unknown as AccessDao);
const actor = { userId: "30000000-0000-4000-8000-000000000001" };

describe("AuthoringAccessPolicy", () => {
  it("UT-085 allows a current administrator who owns the draft", async () => {
    expect(await policy(true).canAuthor(actor, { authorUserId: actor.userId })).toBe(true);
    await expect(policy(true).requireAdmin(actor)).resolves.toBeUndefined();
  });

  it("denies authoring to a non-administrator author while history stays readable elsewhere", async () => {
    expect(await policy(false).canAuthor(actor, { authorUserId: actor.userId })).toBe(false);
  });

  it("rejects a non-administrator with admin_required", async () => {
    await expect(policy(false).requireAdmin(actor)).rejects.toMatchObject({ reason: "admin_required" });
  });

  it("never lets an administrator author another person's draft or an imported task", async () => {
    expect(await policy(true).canAuthor(actor, { authorUserId: "someone-else" })).toBe(false);
    expect(await policy(true).canAuthor(actor, { authorUserId: null })).toBe(false);
  });

  it("re-reads administrator status on every call", async () => {
    const isAdmin = vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const demoted = new AuthoringAccessPolicy({ isAdmin } as unknown as AccessDao);
    await expect(demoted.requireAdmin(actor)).resolves.toBeUndefined();
    await expect(demoted.requireAdmin(actor)).rejects.toMatchObject({ reason: "admin_required" });
  });
});
