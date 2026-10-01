import { readFile } from "node:fs/promises";
import { CatalogImporter } from "../application/services/projects/catalogImporter";
import { InMemoryProjectDao } from "../infra/database/dao/projects/inMemoryProjectDao";
import { db } from "../infra/database/client";
import { DrizzleProjectDao } from "../infra/database/dao/projects/drizzleProjectDao";

const fileIndex = process.argv.indexOf("--file");
const file = fileIndex >= 0 ? process.argv[fileIndex + 1] : undefined;
if (!file) throw new Error("Usage: catalog:import -- --file <manifest.json>");
const manifest = JSON.parse(await readFile(file, "utf8"));
const projectDao = db ? new DrizzleProjectDao(db) : new InMemoryProjectDao();
const result = await new CatalogImporter(projectDao).import(manifest);
console.log(JSON.stringify(result));
