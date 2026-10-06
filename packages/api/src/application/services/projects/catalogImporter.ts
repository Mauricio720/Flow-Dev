import type { ProjectDao } from "../../database/dao/projectDao";
import { CatalogVerifier, type CatalogEntry } from "./catalogVerifier";
export { InvalidCatalogManifestError, type CatalogEntry } from "./catalogVerifier";

export class CatalogImporter {
  constructor(private readonly projects: ProjectDao, private readonly verifier: CatalogVerifier) {}
  async import(userId: string, manifest: CatalogEntry[]) {
    const verified = await this.verifier.verify(userId, manifest);
    if (!this.projects.transaction) throw new Error("Catalog import requires a transaction");
    return this.projects.transaction((projects) => this.write(projects, verified));
  }
  private async write(projects: ProjectDao, manifest: CatalogEntry[]) {
    let inserted = 0;
    let updated = 0;
    for (const entry of manifest) {
      if (!projects.upsertVerified) throw new Error("Verified import is unavailable");
      const result = await projects.upsertVerified({ ...entry, description: entry.description ?? null });
      result.inserted ? inserted++ : updated++;
    }
    return { inserted, updated };
  }
}
