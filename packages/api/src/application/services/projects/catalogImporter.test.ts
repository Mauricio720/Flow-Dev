import { describe, expect, it } from "vitest";
import { CatalogImporter } from "./catalogImporter";
import { InMemoryProjectDao } from "../../../infra/database/dao/projects/inMemoryProjectDao";

describe("catalog importer", () => {
  it("keeps the demo id on repeated imports", async () => { const dao = new InMemoryProjectDao(); const importer = new CatalogImporter(dao); const first = await importer.import([{ externalKey: "flow-dev-demo", name: "Flow Dev" }]); const id = (await dao.findByExternalKey("flow-dev-demo"))?.id; const second = await importer.import([{ externalKey: "flow-dev-demo", name: "Flow Dev" }]); expect(first.inserted).toBe(0); expect(second.updated).toBe(1); expect((await dao.findByExternalKey("flow-dev-demo"))?.id).toBe(id); });
  it("validates the complete manifest before writing", async () => { const dao = new InMemoryProjectDao(); await expect(new CatalogImporter(dao).import([{ externalKey: "new", name: "New" }, { externalKey: "new", name: "Duplicate" }])).rejects.toThrow(); expect(await dao.findByExternalKey("new")).toBeNull(); });
});
