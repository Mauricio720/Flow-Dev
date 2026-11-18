import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { requireDatabase, sql } from "../infra/database/client";

try {
  await migrate(requireDatabase(), { migrationsFolder: fileURLToPath(new URL("../../drizzle", import.meta.url)) });
} finally {
  await sql?.end();
}
