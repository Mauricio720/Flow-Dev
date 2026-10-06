import { mkdtemp, mkdir, readFile, writeFile, copyFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { requireDatabase, sql } from "../infra/database/client";

const directory = await mkdtemp(join(tmpdir(), "flow-migrations-"));
try {
  const source = new URL("../../drizzle/", import.meta.url);
  const journal = JSON.parse(await readFile(new URL("meta/_journal.json", source), "utf8"));
  journal.entries = journal.entries.filter((entry: { idx: number }) => entry.idx <= 2);
  await mkdir(join(directory, "meta"));
  await writeFile(join(directory, "meta/_journal.json"), JSON.stringify(journal));
  for (const entry of journal.entries) await copyFile(new URL(`${entry.tag}.sql`, source), join(directory, `${entry.tag}.sql`));
  await migrate(requireDatabase(), { migrationsFolder: directory });
} finally { await rm(directory, { recursive: true, force: true }); await sql?.end(); }
