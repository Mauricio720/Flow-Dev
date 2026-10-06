import type { CatalogVerifier } from "./catalogVerifier";
import type { ProjectDao } from "../../database/dao/projectDao";
import { CatalogImporter, type CatalogEntry } from "./catalogImporter";

export class ProjectCatalogService {
  constructor(private readonly importer: CatalogImporter) {}
  import(userId: string, manifest: CatalogEntry[]) { return this.importer.import(userId, manifest); }
}

export function createProjectCatalogService(projects: ProjectDao, verifier: CatalogVerifier) {
  return new ProjectCatalogService(new CatalogImporter(projects, verifier));
}
