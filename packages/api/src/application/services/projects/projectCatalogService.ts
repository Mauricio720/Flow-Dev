import type { ProjectDao } from "../../database/dao/projectDao";
import { CatalogImporter, type CatalogEntry } from "./catalogImporter";

export class ProjectCatalogService {
  constructor(private readonly importer: CatalogImporter) {}
  import(manifest: CatalogEntry[]) { return this.importer.import(manifest); }
}

export function createProjectCatalogService(projects: ProjectDao) {
  return new ProjectCatalogService(new CatalogImporter(projects));
}
