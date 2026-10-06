import { expect, it, vi } from "vitest";
import { CatalogImporter } from "./catalogImporter";
import { CatalogVerifier } from "./catalogVerifier";
import { InMemoryProjectDao } from "../../../infra/database/dao/projects/inMemoryProjectDao";
import type { AccessDao } from "../../database/dao/accessDao";
import type { RepositoryAuthorizationService } from "../../github/repositoryAuthorizationService";
import type { GitHubRepositoryGateway } from "../../github/repositoryGateway";

const repository = { githubId: "1", nodeId: "node-1", owner: "flow", name: "dev", visibility: "private" as const, archived: false };
function setup(admin = true) {
  const dao = new InMemoryProjectDao();
  const resolve = vi.fn(async () => repository);
  const verifier = new CatalogVerifier({ permissions: { isAdmin: async () => admin } as unknown as AccessDao, authorization: { accessToken: async () => "token" } as unknown as RepositoryAuthorizationService, github: { resolve } as unknown as GitHubRepositoryGateway });
  return { dao, resolve, importer: new CatalogImporter(dao, verifier) };
}
it("keeps the demo ID after verified repeat imports", async () => {
  const { dao, importer, resolve } = setup();
  const entry = { externalKey: "flow-dev-demo", name: "Flow Dev", repository };
  const id = (await dao.findByExternalKey(entry.externalKey))?.id;
  expect(await importer.import("admin", [entry])).toEqual({ inserted: 0, updated: 1 });
  expect(await importer.import("admin", [entry])).toEqual({ inserted: 0, updated: 1 });
  expect((await dao.findByExternalKey(entry.externalKey))?.id).toBe(id);
  expect(resolve).toHaveBeenCalledTimes(2);
});
it("rejects invented IDs and unprivileged imports before writes", async () => {
  const { importer, resolve, dao } = setup();
  await expect(importer.import("admin", [{ externalKey: "new", name: "New", repository: { ...repository, githubId: "made-up" } }])).rejects.toThrow();
  expect(resolve).not.toHaveBeenCalled();
  expect(await dao.findByExternalKey("new")).toBeNull();
  const member = setup(false);
  await expect(member.importer.import("member", [{ externalKey: "new", name: "New", repository }])).rejects.toThrow();
  expect(member.resolve).not.toHaveBeenCalled();
});
it("resolves every entry before opening the import transaction", async () => {
  const { importer, resolve, dao } = setup();
  const transaction = vi.spyOn(dao, "transaction");
  resolve.mockResolvedValueOnce(repository).mockRejectedValueOnce(new Error("GitHub unavailable"));
  await expect(importer.import("admin", ["one", "two"].map((externalKey) => ({ externalKey, name: "New", repository })))).rejects.toThrow();
  expect(transaction).not.toHaveBeenCalled();
  expect(await dao.findByExternalKey("one")).toBeNull();
});
it("rejects a real node whose numeric identity disagrees with the manifest", async () => {
  const { importer, dao } = setup();
  await expect(importer.import("admin", [{ externalKey: "new", name: "New", repository: { ...repository, githubId: "303" } }])).rejects.toThrow();
  expect(await dao.findByExternalKey("new")).toBeNull();
});
