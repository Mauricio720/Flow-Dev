import { describe, expect, it, vi } from "vitest";
import type { LocalCheckoutDao, StoredLocalCheckout } from "../../database/dao/localCheckoutDao";
import type { ProjectDao, ProjectRecord } from "../../database/dao/projectDao";
import type { FolderPicker } from "../../terminal/folderPicker";
import type { GitCheckoutInspector } from "../../terminal/gitCheckoutInspector";
import { ProjectUnavailableError } from "../access/projectAccessService";
import { LocalCheckoutService } from "./localCheckoutService";

const ACTOR = { userId: "u1" } as never;
const PROJECT = { id: "p1", repository: { owner: "acme", name: "shop" } } as unknown as ProjectRecord;
const SAVED = { path: "/home/ana/shop", verifiedAt: new Date(), version: 2 } as StoredLocalCheckout;

function serviceWith(options: { visible?: boolean; saved?: StoredLocalCheckout | null; picker?: FolderPicker }) {
  const projects: ProjectDao = { findVisible: async () => (options.visible === false ? null : PROJECT) };
  const checkouts = { find: vi.fn(async () => options.saved ?? null) } as unknown as LocalCheckoutDao;
  const inspector = { inspect: vi.fn() } as unknown as GitCheckoutInspector;
  return new LocalCheckoutService({ projects, checkouts, inspector, picker: options.picker });
}

describe("LocalCheckoutService.pickFolder", () => {
  it("opens the picker at the folder already linked by this user", async () => {
    const picker = { pick: vi.fn(async () => ({ kind: "picked" as const, path: "/home/ana/other" })) };
    const result = await serviceWith({ saved: SAVED, picker }).pickFolder(ACTOR, "p1");
    expect(picker.pick).toHaveBeenCalledWith("/home/ana/shop");
    expect(result).toEqual({ kind: "picked", path: "/home/ana/other" });
  });

  it("opens the picker without a start folder when nothing is linked", async () => {
    const picker = { pick: vi.fn(async () => ({ kind: "cancelled" as const })) };
    await serviceWith({ picker }).pickFolder(ACTOR, "p1");
    expect(picker.pick).toHaveBeenCalledWith(null);
  });

  it("refuses a project the user cannot see and never opens the dialog", async () => {
    const picker = { pick: vi.fn() };
    await expect(serviceWith({ visible: false, picker }).pickFolder(ACTOR, "p1")).rejects.toBeInstanceOf(ProjectUnavailableError);
    expect(picker.pick).not.toHaveBeenCalled();
  });

  it("reports unavailable when no picker is configured", async () => {
    await expect(serviceWith({}).pickFolder(ACTOR, "p1")).resolves.toEqual({ kind: "unavailable" });
  });
});
