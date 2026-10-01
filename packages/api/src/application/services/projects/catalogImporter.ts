import type { ProjectDao } from "../../database/dao/projectDao";

export type CatalogEntry = { externalKey: string; name: string; description?: string };
export class InvalidCatalogManifestError extends Error {}

export class CatalogImporter {
  constructor(private readonly projects: ProjectDao) {}
  async import(manifest: CatalogEntry[]) {
    validateManifest(manifest);
    let inserted = 0;
    let updated = 0;
    for (const entry of manifest) {
      const result = await this.projects.upsert(entry);
      result.inserted ? inserted++ : updated++;
    }
    return { inserted, updated };
  }
}

function validateManifest(manifest: CatalogEntry[]) {
  if (!Array.isArray(manifest)) throw new InvalidCatalogManifestError("Manifest must be an array");
  const keys = new Set<string>();
  for (const entry of manifest) {
    if (!entry || typeof entry.externalKey !== "string" || !/^[-a-z0-9]+$/.test(entry.externalKey) || keys.has(entry.externalKey)) throw new InvalidCatalogManifestError("Manifest contains duplicate or invalid externalKey");
    if (typeof entry.name !== "string" || entry.name.trim().length === 0) throw new InvalidCatalogManifestError("Manifest contains an empty name");
    if (entry.description !== undefined && typeof entry.description !== "string") throw new InvalidCatalogManifestError("Manifest contains an invalid description");
    keys.add(entry.externalKey);
  }
}
