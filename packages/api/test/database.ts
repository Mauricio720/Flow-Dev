import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../src/infra/database/schema";

export async function testDatabase(legacy = false) {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("TEST_DATABASE_URL must point to a disposable PostgreSQL server");
  const admin = postgres(url, { max: 1, onnotice: () => {} });
  const name = `flow_test_${randomUUID().replaceAll("-", "")}`;
  await admin`CREATE DATABASE ${admin(name)}`;
  const target = new URL(url);
  target.pathname = `/${name}`;
  const client = postgres(target.toString(), { max: 5, onnotice: () => {} });
  await applyMigration(client, "0000_catalog");
  await applyMigration(client, "0001_auth_access");
  if (!legacy) {
    await client`DELETE FROM projects`;
    await applyMigration(client, "0002_repository_expansion");
    await applyMigration(client, "0003_repository_constraints");
    for (const migration of ["0004_wealthy_groot", "0005_daily_agent_brand", "0006_complex_gladiator", "0007_brief_loki", "0008_great_agent_brand", "0009_material_maelstrom", "0010_fast_microbe", "0011_petite_the_renegades", "0012_steady_planning", "0013_spec_workflow"]) await applyMigration(client, migration);
  }
  const close = async () => { await client.end(); await admin`DROP DATABASE ${admin(name)}`; await admin.end(); };
  return { client, database: drizzle(client, { schema }), close, url: target.toString() };
}

export async function applyMigration(client: postgres.Sql, name: string) {
  const sql = await readFile(new URL(`../drizzle/${name}.sql`, import.meta.url), "utf8");
  await client.begin(async (tx) => { await tx.unsafe(sql); });
}
